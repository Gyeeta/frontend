
import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import moment from 'moment';
import axios from 'axios';

import {Button, Space, Slider, Modal, Descriptions, Statistic, Typography, Tag, Alert, notification, message} from 'antd';
import {PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';

import {format} from "d3-format";

import './hostViewPage.css';

import {NodeApis} from './components/common.js';
import {ColumnInfo, fixedSeriesAddItems, getTimeEvent, getTimeSeries, stateColorStyle, stateScatterRadius, getScatterObj, GyLineChart} from './components/gyChart.js';
import {safetypeof, NullID, getStateColor, msecStrFormat, kbStrFormat, MBStrFormat, validateApi, CreateRectSvg, fixedArrayAddItems, ComponentLife, 
	CreateTab, ButtonModal, strTruncateTo, arrayFilter} from './components/util.js';
import {ProcSvcInfo, procTableTab, ProcStateMultiQuickFilter, ProcInfoDesc, AggrProcModalCard, aggrHostAggrCol, hostAggrRangeCol} from './procDashboard.js';
import {NetDashboard} from './netDashboard.js';
import {HostInfoDesc} from './hostViewPage.js';
import {cpumemTableTab} from './cpuMemPage.js';
import {TimeRangeAggrModal} from './components/dateTimeZone.js';
import {SearchTimeFilter, SearchWrapConfig} from './multiFilters.js';
import {GyTable, getTableScroll} from './components/gyTable.js';

const { ErrorBoundary } = Alert;
const { Title } = Typography;

export const ProcIssueSource = [
	{ name : "No Issue", 					value : 0 },
	{ name : "Process CPU Delay", 				value : 1 }, 
	{ name : "Process Block IO Delay", 			value : 2 }, 
	{ name : "Process Memory SwapIn Delay", 		value : 3 }, 
	{ name : "Process Memory Reclaim Delay", 		value : 4 }, 
	{ name : "Process Memory Thrashing Delay", 		value : 5 }, 
	{ name : "Process Voluntary Context Switches", 		value : 6 }, 
	{ name : "Process Involuntary Context Switches", 	value : 7 }, 
	{ name : "Process Major Page Fault", 			value : 8 }, 
	{ name : "Process High CPU Utilization", 		value : 9 }, 
	{ name : "Process Suspended", 				value : 10 }, 
	{ name : "Kernel Suspension or ptrace debugging", 	value : 11 }, 
];


const fixedArraySize 	= 200;
const realtimesec 	= 5;

const cpuTitle 		= "Total CPU Utilization %";
const rssTitle		= "Total Resident Memory (RSS) MB";
const cpuDelayTitle	= "Total CPU Delays (msec)";
const vmDelayTitle 	= "Total Virtual Memory Delays (msec)";
const ioDelayTitle 	= "Total Block IO Delays (msec)";
const netTitle		= "Network Traffic per 15 sec (KB) vs New TCP Connections";

const stateCol 	= new ColumnInfo("state", "Bad Process State", getStateColor("Bad"), 1, "", true /* isextra */, true /* enableLegend */, false /* isnumber */,
					(event, val) => { return { fill : getStateColor(val) } }); 

const cpuColumns	= [
	new ColumnInfo("cpu", "CPU Utilization %", "orange", 1, ",.3f"), 
	stateCol,
];

const rssColumns	= [
	new ColumnInfo("rss", "Resident Memory RSS MB", "steelblue", 1, ","), 
	stateCol,
];

const cpuDelayColumns	= [
	new ColumnInfo("cpudel", "CPU Delays (msec)", "Tomato", 1, ","), 
	stateCol,
];

const vmDelayColumns	= [
	new ColumnInfo("vmdel", "Virtual Memory Delays (msec)", "orange", 1, ","), 
	stateCol,
];

const ioDelayColumns	= [
	new ColumnInfo("iodel", "Block IO Delays (msec)", "DarkSeaGreen", 1, ","), 
	stateCol,
];

const netColumns 	= [
	new ColumnInfo("netkb", "Network Traffic per 15 sec in KB", "orange", 1, ","), 
	stateCol,
	new ColumnInfo("nconn", "New TCP Connections", "green", 2, ","), 
];

const procScatterStyle 	= (column, event) => { return stateColorStyle(column, event, "state") };
const procRadiusCb 	= (column, event) => { return stateScatterRadius(column, event, "state", true) };

function getScatterArray(piggybackCol, yaxis, radiusCb)
{ 
	return [
		getScatterObj("state", yaxis, procScatterStyle, radiusCb, ".0f", "rect", piggybackCol),
	];
}	

class ChartInfo
{
	constructor(title, columns)
	{
		this.title_		= title;
		this.columns_		= columns;
		this.chartobj_		= [
		{	// Y1
			timeseries_	: null,
			fixedarray_	: [],
			columns_	: columns,
		},
		{	// Y2
			timeseries_	: null,
			fixedarray_	: [],
			columns_	: columns,
		},
		];
	}	
};	

// Returns true or exception string
function getChartSeries(chartobj, newdata, isrealtime, isY1series = true)
{
	try {
		if (isrealtime === false) {
			chartobj.timeseries_ = getTimeSeries(newdata, chartobj.columns_, isY1series, "time", true /* sortdata */);

			return true;
		}

		const		eventarr = [];
		const		startidx = newdata.length < fixedArraySize ? 0 : newdata.length - fixedArraySize;	

		for (let i = startidx; i < newdata.length; ++i) {
			eventarr.push(getTimeEvent(newdata[i], chartobj.columns_, isY1series, 'time'));
		}	

		chartobj.timeseries_ = fixedSeriesAddItems(eventarr, chartobj.fixedarray_, fixedArraySize, chartobj.columns_, isY1series, true /* sortdata */);

		return true;
	}
	catch(e) {
		console.log(`Exception caught while updating chart series : ${e}\n${e.stack}\n`);
		return e.message;
	}	
}	

function initSummary(summary)
{
	summary.nrecs			= 0;
	summary.naggrrecs		= 0;

	summary.starttime		= '';
	summary.endtime			= '';

	summary.procbadsevere		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.issuesourcearr		= new Array(ProcIssueSource.length);

	for (let i = 0; i < summary.issuesourcearr.length; ++i) {
		summary.issuesourcearr[i]	= {
							nrecs		: 0,
							firstidx	: 0,
							lastidx		: 0,
						};	
	}					

	summary.statemarker		= [];

}	

function setAggrDataState(data)
{
	if ((safetypeof(data) !== 'array') || (data.length === 0)) {
		return data;
	}	

	try {
		for (let i = 0; i < data.length; ++i) {
			const		item = data[i];
				
			// If > 10 % issue records mark state as Bad
			if ((item.issue > 0) && (item.issue * 10 >= item.inrecs)) {
				item.state = 'Bad';
			}	
			else {
				item.state = 'Good';
			}
		}	

		return data;
	}
	catch(e) {
		console.log(`Exception occured while calculating Aggr Data State : ${e}`);

		return data;
	}	
}

function calcSummary(data, summary, isaggregated)
{
	try {
		if ((safetypeof(data) !== 'array') || (data.length === 0)) {
			return;
		}	

		initSummary(summary);
		
		let			lastitem = data[data.length - 1];
		let			startmom = moment(data[0].time, moment.ISO_8601), endmom = moment(lastitem.time, moment.ISO_8601);

		if (isaggregated === false) {
			summary.nrecs		= data.length;
		}
		else {
			summary.naggrrecs	= data.length;
		}	
		summary.dataarr		= data;

		for (let i = 0; i < data.length; ++i) {
			const		item = data[i];
			const		mom = moment(item.time, moment.ISO_8601);
			let		statemarker = false;

			if (mom < startmom) {
				startmom = mom;
			}	

			if (mom > endmom) {
				endmom = mom;
			}	
			
			if (isaggregated === false) {

				if (item.state === 'Bad' || item.state === 'Severe') {
					if (summary.procbadsevere.nrecs === 0) {
						summary.procbadsevere.firstidx = i;
					}	

					summary.procbadsevere.nrecs++;
					summary.procbadsevere.lastidx = i;

					statemarker = true;
				}	

				if ((item.issue > 0) && (item.issue < ProcIssueSource.length)) {
					const		sobj = summary.issuesourcearr[item.issue];

					if (sobj.nrecs === 0) {
						sobj.firstidx = i;
					}	

					sobj.nrecs++;
					sobj.lastidx = i;
				}	
			}
			else {
				summary.nrecs += item.inrecs;

				if (item.issue > 0) {
					if (summary.procbadsevere.nrecs === 0) {
						summary.procbadsevere.firstidx = i;
					}	

					summary.procbadsevere.nrecs += item.issue;
					summary.procbadsevere.lastidx = i;

					statemarker = true;

					if (item.incpudel > 0) {
						const		sobj = summary.issuesourcearr[1];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.iniodel > 0) {
						const		sobj = summary.issuesourcearr[2];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.inswpdel > 0) {
						const		sobj = summary.issuesourcearr[3];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.inrecdel > 0) {
						const		sobj = summary.issuesourcearr[4];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.inthrdel > 0) {
						const		sobj = summary.issuesourcearr[5];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.invcsw > 0) {
						const		sobj = summary.issuesourcearr[6];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.inivcsw > 0) {
						const		sobj = summary.issuesourcearr[7];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.inpgflt > 0) {
						const		sobj = summary.issuesourcearr[8];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.incpu > 0) {
						const		sobj = summary.issuesourcearr[9];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.instop > 0) {
						const		sobj = summary.issuesourcearr[10];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.inptr > 0) {
						const		sobj = summary.issuesourcearr[11];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
				}	
			}	

			if (statemarker) {
				summary.statemarker.push(i);
			}	
		}	

		summary.starttime	= startmom.format('YYYY-MM-DD HH:mm:ssZ');
		summary.endtime		= endmom.format('YYYY-MM-DD HH:mm:ssZ');

	}
	catch(e) {
		console.log(`Exception occured while calculating summary : ${e}`);

		notification.error({message : "Data Summary Exception Error", description : `Exception occured while summarizing new data : ${e.message}`});
	}	
}	

function ProcHostSummary({procid, parid, objref, isRealTime, aggregatesec, aggroper, timeSliderIndex, modalCount, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const 			summary = objref.current.summary;	
	const			isaggregated = (aggregatesec !== undefined);
	const			procinfo = objref.current.procinfo;
	const			issvc = (procinfo && procinfo.relsvcid !== NullID);
	const			avgstr = (isaggregated ? "Aggr " : "");

	const title = (<div style={{ textAlign : 'center' }}><Title level={4}>Summary for Process <em>{objref.current.procname}</em> of Host <em>{summary.hostname}</em></Title></div>);

	let 			lastitem = null, ismid = false;
	
	if (summary.dataarr && safetypeof(summary.dataarr) === 'array' && summary.dataarr.length > 0) {
		if (timeSliderIndex >= 0 && (timeSliderIndex < summary.dataarr.length)) {
			lastitem = summary.dataarr[timeSliderIndex];
			ismid = true;
		}	
		else {
			lastitem = summary.dataarr[summary.dataarr.length - 1];
		}
	}	

	let			ltime;

	if (lastitem && lastitem.time) {
		ltime = `Last Seen Statistics at time ${lastitem.time}`;
	}	
	else {
		ltime = 'Last Seen Statistics';
	}	

	const lasttitle = (<div style={{ textAlign : 'center', marginTop: 20 }}><span style={{ fontSize: 16 }}> 
				<em><strong>{aggregatesec ? `${aggregatesec/60} min ${aggroper} Aggregated` : ""} {ltime}</strong></em></span></div>);

	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Process Host Info</strong></span>,
			content : (
				<>
				<ComponentLife stateCB={modalCount} />
				<HostInfoDesc parid={parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				</>
			),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	


	const getProcSvc = () => {
		if (!procinfo) {
			return null;
		}

		Modal.info({
			title : <span><strong>Services of Process {procinfo.name}</strong></span>,
			content : (
				<>
				<ComponentLife stateCB={modalCount} />
				<ProcSvcInfo procid={procid} procname={procinfo.name} parid={parid} relsvcid={procinfo.relsvcid} 
					starttime={lastitem && lastitem.time ? lastitem.time : undefined} isTabletOrMobile={isTabletOrMobile} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				</>
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getProcInfo = () => {
		if (!procinfo) {
			return null;
		}

		Modal.info({
			title : <span><strong>Services of Process {procinfo.name}</strong></span>,
			content : (
				<>
				<ComponentLife stateCB={modalCount} />
				<ProcInfoDesc procid={procid} parid={parid} starttime={summary.starttime} endtime={summary.endtime}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} procInfoObj={procinfo} />
				</>
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const tableOnRow = (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Process {record.name} State</strong></span>,
					content : (
						<>
						<AggrProcModalCard rec={record} parid={parid} 
							aggrMin={aggregatesec >= 60 ? aggregatesec/60 : 1} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
						</>
						),

					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
				});
			}
		};		
	};

	const createLinkModal = (linktext, desc, filt, firstidx, lastidx, nrecs, extraelemcb) => {

		const modonclick = () => {
			Modal.info({
				title : <div style={{ textAlign : 'center' }}>{<em>{desc}</em> }</div>,

				content : (
					<>
					{typeof extraelemcb === 'function' && ( <div style={{ marginBottom : 30 }}> {extraelemcb()} </div>)}
					<GyTable columns={isaggregated ? aggrHostAggrCol(aggroper) : hostAggrRangeCol} onRow={tableOnRow} 
							dataSource={arrayFilter(filt, summary.dataarr, firstidx, lastidx, nrecs)} 
							rowKey={((record) => record.host + record.time)} scroll={getTableScroll()} />
					</>
					),

				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
			});
		};	
		
		return <Button type='dashed' onClick={typeof filt === 'function' ? modonclick : undefined} >{linktext}</Button>;
	};


	let			svcbutton = null, procbutton = null;

	if (issvc) {
		svcbutton = <Button type='dashed' onClick={getProcSvc} >Get '{procinfo.name}' Service Info</Button>;
	}	

	if (procinfo) {
		procbutton = <Button type='dashed' onClick={getProcInfo}>
					View Process Info</Button>;
	}	

	return (
		<>
		<Descriptions title={title} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em>First Record Time</em>}>
				<span style={{ fontSize: 14 }}><em>{summary.starttime}</em></span>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Last Record Time</em>}>
				<span style={{ fontSize: 14 }}><em>{summary.endtime}</em></span>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Process Gyeeta ID</em>}>
				<span style={{ fontSize: 12 }}><em>{procid}</em></span>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {isaggregated ? "Individual " : ""} Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nrecs} />
			</Descriptions.Item>

			{isaggregated &&
			<Descriptions.Item 
				label={<em># Aggregated Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.naggrrecs} />
			</Descriptions.Item>
			}

			<Descriptions.Item label={<em>Host Info</em>}> <Button type='dashed' onClick={getHostInfo} >Get Host Information</Button> </Descriptions.Item>

			<Descriptions.Item label={<em>Cluster Name</em>}> <span style={{ fontSize: 14 }}><em>{summary.clustername}</em></span> </Descriptions.Item>

			{procinfo && <Descriptions.Item label={<em>Process Start Time</em>}>{procinfo.tstart}</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Process Command Line</em>}>{strTruncateTo(procinfo.cmdline, 80)}</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Region Name</em>}>{procinfo.region}</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Zone Name</em>}>{procinfo.zone}</Descriptions.Item>}
			{procinfo && procinfo.tag.length && <Descriptions.Item label={<em>Process Tags </em>}>{procinfo.tag}</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Processes within Container</em>}>{procinfo.conproc ? "Yes" : "No"}</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Total # Threads</em>}>{format(",")(procinfo.nthr)}</Descriptions.Item>}
			{procinfo && procinfo.cputhr && <Descriptions.Item label={<em>cgroup CPU Limited to</em>}>{procinfo.cgcpulimpct} %</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Curent Memory cgroup Util %</em>}>{procinfo.cgrsspct} %</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Current p95 CPU</em>}>{procinfo.p95cpupct} %</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>p95 CPU Delay</em>}>{format(",")(procinfo.p95cpudel)} msec</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>p95 Blkio Delay</em>}>{format(",")(procinfo.p95iodel)} msec</Descriptions.Item>}
			{procinfo && <Descriptions.Item label={<em>Process Info</em>}>{procbutton}</Descriptions.Item>}
			{issvc && <Descriptions.Item label={<em>Process Services</em>}>{svcbutton}</Descriptions.Item>}

			<Descriptions.Item 
				label={<em># Bad States</em>}>
				<Space>

				{summary.procbadsevere.nrecs > 0 ? createLinkModal((
					<>
					{CreateRectSvg('red')}
					<span style={{ fontSize: 14 }}><em>&nbsp; {summary.procbadsevere.nrecs} </em></span>
						{!isTabletOrMobile && <span style={{ fontSize: 12 }}><em>&nbsp; / {summary.nrecs}</em></span>}
					</>
					), 'Process Issue', 
					(item) => (item.state === 'Bad' || item.state === 'Severe' || (isaggregated && item.issue > 0)), 
					summary.procbadsevere.firstidx, summary.procbadsevere.lastidx + 1, summary.procbadsevere.nrecs,
				) : `0 / ${summary.nrecs}`}

				</Space>
			</Descriptions.Item>

			{summary.issuesourcearr[1] && summary.issuesourcearr[1].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by CPU Delays</em>}>
				{summary.issuesourcearr[1].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[1].nrecs} />
					), 'CPU Delays', 
					(item) => ((!isaggregated && item.issue === 1) || (isaggregated && item.incpudel > 0)), 
						summary.issuesourcearr[1].firstidx, summary.issuesourcearr[1].lastidx + 1, summary.issuesourcearr[1].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[2] && summary.issuesourcearr[2].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Block IO Delays</em>}>
				{summary.issuesourcearr[2].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[2].nrecs} />
					), 'Block IO Delays', 
					(item) => ((!isaggregated && item.issue === 2) || (isaggregated && item.iniodel > 0)), 
						summary.issuesourcearr[2].firstidx, summary.issuesourcearr[2].lastidx + 1, summary.issuesourcearr[2].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[3] && summary.issuesourcearr[3].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Memory Swapin Delays</em>}>
				{summary.issuesourcearr[3].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[3].nrecs} />
					), 'Memory Swapin Delays', 
					(item) => ((!isaggregated && item.issue === 3) || (isaggregated && item.inswpdel > 0)), 
						summary.issuesourcearr[3].firstidx, summary.issuesourcearr[3].lastidx + 1, summary.issuesourcearr[3].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[4] && summary.issuesourcearr[4].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Memory Reclaim Delays</em>}>
				{summary.issuesourcearr[4].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[4].nrecs} />
					), 'Memory Reclaim Delays', 
					(item) => ((!isaggregated && item.issue === 4) || (isaggregated && item.inrecdel > 0)), 
						summary.issuesourcearr[4].firstidx, summary.issuesourcearr[4].lastidx + 1, summary.issuesourcearr[4].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[5] && summary.issuesourcearr[5].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Memory Thrashing Delays</em>}>
				{summary.issuesourcearr[5].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[5].nrecs} />
					), 'Memory Thrashing Delays', 
					(item) => ((!isaggregated && item.issue === 5) || (isaggregated && item.inthrdel > 0)), 
						summary.issuesourcearr[5].firstidx, summary.issuesourcearr[5].lastidx + 1, summary.issuesourcearr[5].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[6] && summary.issuesourcearr[6].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Voluntary Context Switches</em>}>
				{summary.issuesourcearr[6].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[6].nrecs} />
					), 'Voluntary Context Switches', 
					(item) => ((!isaggregated && item.issue === 6) || (isaggregated && item.invcsw > 0)), 
						summary.issuesourcearr[6].firstidx, summary.issuesourcearr[6].lastidx + 1, summary.issuesourcearr[6].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[7] && summary.issuesourcearr[7].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Involuntary Context Switches</em>}>
				{summary.issuesourcearr[7].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[7].nrecs} />
					), 'Involuntary Context Switches', 
					(item) => ((!isaggregated && item.issue === 7) || (isaggregated && item.inivcsw > 0)), 
						summary.issuesourcearr[7].firstidx, summary.issuesourcearr[7].lastidx + 1, summary.issuesourcearr[7].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[8] && summary.issuesourcearr[8].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Major Page Faults</em>}>
				{summary.issuesourcearr[8].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[8].nrecs} />
					), 'Major Page Faults', 
					(item) => ((!isaggregated && item.issue === 8) || (isaggregated && item.inpgflt > 0)), 
						summary.issuesourcearr[8].firstidx, summary.issuesourcearr[8].lastidx + 1, summary.issuesourcearr[8].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[9] && summary.issuesourcearr[9].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by High CPU Utilization</em>}>
				{summary.issuesourcearr[9].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[9].nrecs} />
					), 'High CPU Utilization', 
					(item) => ((!isaggregated && item.issue === 9) || (isaggregated && item.incpu > 0)), 
						summary.issuesourcearr[9].firstidx, summary.issuesourcearr[9].lastidx + 1, summary.issuesourcearr[9].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[10] && summary.issuesourcearr[10].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Process Suspension</em>}>
				{summary.issuesourcearr[10].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[10].nrecs} />
					), 'Process Suspension', 
					(item) => ((!isaggregated && item.issue === 10) || (isaggregated && item.instop > 0)), 
						summary.issuesourcearr[10].firstidx, summary.issuesourcearr[10].lastidx + 1, summary.issuesourcearr[10].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[11] && summary.issuesourcearr[11].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Kernel Suspension or ptrace debugging</em>}>
				{summary.issuesourcearr[11].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[11].nrecs} />
					), 'High CPU Utilization', 
					(item) => ((!isaggregated && item.issue === 11) || (isaggregated && item.inptr > 0)), 
						summary.issuesourcearr[11].firstidx, summary.issuesourcearr[11].lastidx + 1, summary.issuesourcearr[11].nrecs
					) : 0}
			</Descriptions.Item>
			}

		</Descriptions>

		{ lastitem && (isRealTime || ismid) && (

			<Descriptions title={lasttitle} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >

			<Descriptions.Item 
				label={<em>{!ismid && `Last`} {avgstr} Process State</em>}>
				{CreateRectSvg(getStateColor(lastitem.state))}
				<span> {lastitem.state} </span>
			</Descriptions.Item>

			{isaggregated && <Descriptions.Item label={<em># Bad States</em>}> {lastitem.issue} / {lastitem.inrecs} </Descriptions.Item>}

			<Descriptions.Item label={<em># {avgstr} Processes</em>}>{format(",")(lastitem.nprocs)}</Descriptions.Item>
			<Descriptions.Item label={<em>{avgstr} Total CPU Utilization</em>}>{lastitem.cpu} %</Descriptions.Item>
			<Descriptions.Item label={<em>{avgstr} Total Resident Memory (RSS)</em>}>{MBStrFormat(lastitem.rss)}</Descriptions.Item>
			<Descriptions.Item label={<em>{avgstr} CPU Delays</em>}>{msecStrFormat(lastitem.cpudel)}</Descriptions.Item>
			<Descriptions.Item label={<em>Virtual Memory Delays</em>}>{msecStrFormat(lastitem.vmdel)}</Descriptions.Item>
			<Descriptions.Item label={<em>Block IO Delays</em>}>{msecStrFormat(lastitem.iodel)}</Descriptions.Item>
			<Descriptions.Item label={<em>{avgstr} Network Traffic</em>}>{kbStrFormat(lastitem.netkb)}</Descriptions.Item>
			<Descriptions.Item label={<em>New TCP Connections</em>}>{format(",")(lastitem.nconn)}</Descriptions.Item>
			{!isaggregated && <Descriptions.Item label={<em>Process State Analysis</em>}>{lastitem.desc}</Descriptions.Item>}

			</Descriptions>
			)
		}	

		</>

	);		
}

export function ProcMonitor({procid, parid, isRealTime, starttime, endtime, aggregatesec, aggregatetype, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile})
{
	const 		objref = useRef(null);
	const		cpuRef = useRef(null), rssRef = useRef(null), cpuDelayRef = useRef(null), vmDelayRef = useRef(null), ioDelayRef = useRef(null), netRef = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[realtimePaused, setrealtimePaused] = useState(false);
	const		[isaggregated, ] = useState(aggregatesec ? aggregatesec >= 2 * realtimesec : false);
	const		[aggroper, ] = useState(aggregatetype ?? "avg");
	const		[fetchIntervalmsec, ] = useState((isaggregated ? aggregatesec * 1000 : realtimesec * 1000));
	const		[timeSliderIndex, setTimeSlider] = useState(null);
	const		[forceSummary, setForceSummary] = useState(false);

	if (objref.current === null) {
		console.log(`ProcMonitor initializing for first time : isRealTime=${isRealTime} starttime=${starttime} endtime=${endtime} aggregatesec=${aggregatesec} aggregatetype=${aggregatetype}`);

		objref.current = {
			isstarted 		: false,
			niter			: 0,
			isdrilldown		: false,
			updtracker		: null,
			nextfetchtime		: Date.now(),
			nerrorretries		: 0,
			lastpausetime		: '',
			pauserealtime		: false,
			resumerealtime		: false,
			prevdata		: null,
			prevdatastart		: null,
			prevdatasec		: 0,
			prevsummary		: null,
			prevcharts		: null,
			timeSliderIndex		: null,
			sliderTimer		: null,
			maxSlider		: 0,
			modalCount		: 0,
			procid			: procid,
			procname		: '',
		};	

		objref.current[cpuTitle] 		= new ChartInfo(cpuTitle, cpuColumns); 	
		objref.current[rssTitle] 		= new ChartInfo(rssTitle, rssColumns); 	
		objref.current[cpuDelayTitle] 		= new ChartInfo(cpuDelayTitle, cpuDelayColumns); 	
		objref.current[vmDelayTitle] 		= new ChartInfo(vmDelayTitle, vmDelayColumns); 	
		objref.current[ioDelayTitle] 		= new ChartInfo(ioDelayTitle, ioDelayColumns); 	
		objref.current[netTitle] 		= new ChartInfo(netTitle, netColumns); 	

		objref.current.realtimearray	=	[];

		objref.current.summary 		= {
			hostname		: '',
			clustername		: '',
			dataarr			: null,
		};	

		objref.current.procinfo		= null;

		initSummary(objref.current.summary);
	}

	useEffect(() => {
		return () => {
			console.log(`ProcMonitor destructor called...`);
		};	
	}, []);

	const validProps = useMemo(() => {	

		if (!procid) {
			throw new Error(`Mandatory procid not specified`);
		}

		if (!parid) {
			throw new Error(`Mandatory parid not specified`);
		}

		if (!isRealTime) {
			if (!starttime || !endtime) {
				throw new Error(`Mandatory Parameters starttime / endtime not specified`);
			}	

			if (false === moment(starttime, moment.ISO_8601).isValid()) {
				throw new Error(`Invalid starttime specified : ${starttime}`);
			}	

			if (false === moment(endtime, moment.ISO_8601).isValid()) {
				throw new Error(`Invalid endtime specified : ${endtime}`);
			}	
		}	

		return true;
	}, [procid, parid, isRealTime, starttime, endtime]);	

	if (validProps === false) {
		// This should not occur
		throw new Error(`Internal Error : ProcMonitor validProps check failed`);
	}	

	const modalCount = useCallback((isup) => {
		if (isup === true) {
			objref.current.modalCount++;
		}	
		else if (isup === false && objref.current.modalCount > 0) {
			objref.current.modalCount--;
		}	
	}, [objref]);	

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		conf, currtime = Date.now(), isstart = false;

				if (currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted)) {
					return;
				}

				if (isRealTime) {
					let		isact = true;

					if (tabKey && typeof isActiveTabCB === 'function') {
						isact = isActiveTabCB(tabKey);
					}

					if (objref.current.resumerealtime === true) {
						if (cpuRef && cpuRef.current) {
							cpuRef.current.setResetZoom();
						}	

						objref.current.resumerealtime 	= false;
						objref.current.pauserealtime	= false;
					}	
					else if (objref.current.isdrilldown || (false === isact) || (objref.current.timeSliderIndex !== null) || (objref.current.modalCount > 0) ||
						(objref.current.pauserealtime === true)) {

						if (objref.current.lastpausetime === '') {
							objref.current.lastpausetime = moment().format();
							setrealtimePaused(true);
						}	

						return;
					}	
				}

				conf = { 
					url 		: NodeApis.procstate, 
					method 		: 'post', 
					data 		: { 
						parid 		: parid,
						timeoutsec 	: isRealTime && !isaggregated ? 10 : 500,
						options		: {
							aggregate	: isaggregated, 
							aggrsec		: isaggregated ? aggregatesec : undefined,
							aggroper	: aggroper,
							filter		: `{ procstate.procid = '${procid}' }`,
							sortcolumns	: isaggregated ? [ "time" ] : undefined,
						},	
						timeoffsetsec	: isRealTime && isaggregated ? aggregatesec : undefined,
					}, 
					timeout 	: isRealTime && !isaggregated ? 10000 : 500000,
				};

				if (false === isRealTime) {
					conf.data.starttime = moment(starttime, moment.ISO_8601).format();
					conf.data.endtime = moment(endtime, moment.ISO_8601).format();

					isstart = true;
				}
				else {
					const mintime = Date.now() - fetchIntervalmsec * (fixedArraySize - 1);

					if (objref.current.isstarted === false) {
						isstart = true;
						
						conf.data.starttime = moment(mintime).format();
						conf.data.endtime = moment().format();
					}
					else {
						if ((objref.current.lastpausetime.length === 25 /* moment().format().length */) || (objref.current.lastpausetime.length === 20 /* UTC */)) {
							const mobj = moment(objref.current.lastpausetime, moment.ISO_8601);

							if (mobj.isValid() && +mobj >= mintime) {
								conf.data.starttime = objref.current.lastpausetime;
							}
							else {
								conf.data.starttime = moment(mintime).format();
							}	

							conf.data.endtime = moment().format();
						}	
					}	
				}

				console.log(`Fetching next interval data...for config ${JSON.stringify(conf)}`);

				setApiData({data : [], isloading : true, isapierror : false});

				let 		res = await axios(conf);

				if (isRealTime) {
					objref.current.nextfetchtime = Date.now() + fetchIntervalmsec;
				}
				else {
					objref.current.nextfetchtime = 0;
				}	

				if (objref.current.lastpausetime.length) {
					objref.current.lastpausetime = '';
					setrealtimePaused(false);
				}

				validateApi(res.data);

				if (safetypeof(res.data) === 'array') { 
					setApiData({data : res.data, isloading : false, isapierror : false});
				}
				else {
					setApiData({data : [], isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Process State Data fetch..."});
					objref.current.nerrorretries++;
				}	

				if (isstart) {
					objref.current.isstarted = true;
				}	

			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new Process State data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				objref.current.nerrorretries++;
				objref.current.nextfetchtime = Date.now() + 30000;
			}	
			finally {
				timer1 = setTimeout(apiCall, 1000);
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for ProcMonitor setinterval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, procid, parid, isRealTime, starttime, endtime, fetchIntervalmsec, aggroper, aggregatesec, isaggregated, tabKey, isActiveTabCB, cpuRef]);	
	
	// procInfo effect	
	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				if (isRealTime) {
					let		isact = true;

					if (tabKey && typeof isActiveTabCB === 'function') {
						isact = isActiveTabCB(tabKey);
					}

					if (objref.current.isdrilldown || (false === isact) || (objref.current.modalCount > 0)) {
						return;
					}	
				}
				else if (objref.current.procinfo !== null) {
					return;
				}	

				const			conf = { 
					url 		: NodeApis.procinfo, 
					method 		: 'post', 
					data 		: { 
						qrytime		: Date.now(),
						starttime	: starttime,
						timeoutsec 	: 100,
						parid		: parid,
						filter		: `{ procinfo.procid = '${procid}' }`,
					}, 
					timeout 	: 100000,
				};

				console.log(`Fetching next interval procinfo data...for config ${JSON.stringify(conf)}`);

				let 		res = await axios(conf);

				validateApi(res.data);

				if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && ('array' === safetypeof(res.data[0].procinfo)) &&
					res.data[0].procinfo.length && ('object' === safetypeof(res.data[0].procinfo[0]))) {

					objref.current.procinfo 	= res.data[0].procinfo[0];

					if (!isRealTime) {
						setForceSummary((oldval) => !oldval);
					}	
				}
				else {
					if (objref.current.prevdatasec > 0) {
						notification.warning({message : "Process Info Data Format", description : "No Data or Invalid Data for Process Info fetch..."});
					}	
				}	
			}
			catch(e) {
				notification.error({message : "Process Info Data Fetch Exception Error", 
						description : `Exception occured while waiting for new Process Info data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response of Process Info : ${e}\n${e.stack}\n`);
			}	
			finally {
				// Repeat every 5.5 min
				timer1 = setTimeout(apiCall, 5 * 60 * 1000 + 30000);
			}
		}, 0);

		return () => { 
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, procid, parid, isRealTime, starttime, tabKey, isActiveTabCB, setForceSummary]);	
	
	const getNetFlows = useCallback((cref) => {
		const			tstart = moment(cref.current?.getRescaleTimerange()[0]).format();
		const			tend = moment(cref.current?.getRescaleTimerange()[1]).format();
		
		console.log(`tstart for getNetFlows is ${tstart} tend is ${tend}`);

		const		tabKey = `NetFlow_${procid}_${tstart}_${tend}}`;
		
		return CreateTab('Network Flows', 
					() => { return <NetDashboard procid={procid} procname={objref.current.procname} parid={parid} autoRefresh={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);

	}, [objref, procid, parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);

	const cpuRescaleComps = useMemo(() => {
		return (
			<>
			</>
		);
	}, [/* cpuRef */]);	

	const rssRescaleComps = useMemo(() => {
		return (
			<>
			</>
		);
	}, [/* rssRef */]);	

	const cpuDelayRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!cpuDelayRef.current) return;

					const			tref = cpuDelayRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ cpudel > 0 }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get All Host Processes with CPU Delays</Button>
			
			
			<Button onClick={() => {
					if (!cpuDelayRef.current) return;

					const			tref = cpuDelayRef;

					cpumemTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Host CPU Memory State</Button>
			
			</Space>
			</>
		);
	}, [cpuDelayRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const vmDelayRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!vmDelayRef.current) return;

					const			tref = vmDelayRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ vmdel > 0 }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get All Host Processes with Memory Delays</Button>
			
			
			<Button onClick={() => {
					if (!vmDelayRef.current) return;

					const			tref = vmDelayRef;

					cpumemTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Host CPU Memory State</Button>
			
			</Space>
			</>
		);
	}, [vmDelayRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const ioDelayRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!ioDelayRef.current) return;

					const			tref = ioDelayRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ iodel > 0 }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get All Host Processes with Block IO Delays</Button>
			
			</Space>
			</>
		);
	}, [ioDelayRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const netRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>
			<Button onClick={(e) => getNetFlows(netRef)}> Get Network Flows </Button>
			</Space>
			</>
		);
	}, [netRef, getNetFlows]);	

	const onRescaleComps = useCallback((title, isrescale) => {

		console.log(`title = ${title} onRescaleComps : isrescale = ${isrescale}`);

		objref.current.isdrilldown = isrescale;

		if (isrescale === false) {
			return null;
		}	

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		switch (title) {

			case cpuTitle 		: return cpuRescaleComps;

			case rssTitle 		: return rssRescaleComps;

			case cpuDelayTitle	: return cpuDelayRescaleComps;

			case vmDelayTitle 	: return vmDelayRescaleComps;

			case ioDelayTitle	: return ioDelayRescaleComps;
			
			case netTitle		: return netRescaleComps;

			default			: return null;
		}
	}, [objref, cpuRescaleComps, rssRescaleComps, cpuDelayRescaleComps, vmDelayRescaleComps, ioDelayRescaleComps, netRescaleComps]);

	const getRefFromTitle = useCallback((title) => {
		switch (title) {
			
			case cpuTitle 		:	return cpuRef;

			case rssTitle		:	return rssRef;

			case cpuDelayTitle	:	return cpuDelayRef;

			case vmDelayTitle	: 	return vmDelayRef;

			case ioDelayTitle	: 	return ioDelayRef;

			case netTitle		: 	return netRef;

			default			:	return null;
		};	

	}, [cpuRef, rssRef, cpuDelayRef, vmDelayRef, ioDelayRef, netRef]);	

	const timeRangeCB = useCallback((title, newtimerange) => {

		console.log(`title = ${title} New Timerange CB : newtimerange = ${newtimerange}`);

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		[cpuTitle, rssTitle, cpuDelayTitle, vmDelayTitle, ioDelayTitle, netTitle].forEach((item) => {
			if (item !== title) {
				const		ref = getRefFromTitle(item);

				if (ref && ref.current) {
					ref.current.setNewTimeRange(newtimerange);
				}
			}	
		});	

	}, [getRefFromTitle]);

	const timeTrackerCB = useCallback((newdate) => {

		[cpuTitle, rssTitle, cpuDelayTitle, vmDelayTitle, ioDelayTitle, netTitle].forEach((item) => {
			const		ref = getRefFromTitle(item);

			if (ref && ref.current) {
				ref.current.setNewTimeTracker(newdate);
			}
		});	

	}, [getRefFromTitle]);

	useEffect(() => {
		if (objref && objref.current && objref.current.updtracker) {
			timeTrackerCB(new Date(objref.current.updtracker));
			objref.current.updtracker = null;
		}	
	}, [objref, timeTrackerCB]);	

	const onTimeSliderChange = useCallback((newindex) => {
		if (objref && objref.current && objref.current.prevdatastart && objref.current.prevdatastart.length > newindex) {
			setTimeSlider(newindex);
			objref.current.timeSliderIndex = newindex;
			objref.current.updtracker = objref.current.prevdatastart[objref.current.prevdatastart.length - 1].time;
		}
	}, [objref]);

	const onTimeSliderAfterChange = useCallback(() => {
		if (objref && objref.current && objref.current.prevdata) {
			if (objref.current.sliderTimer) {
				clearTimeout(objref.current.sliderTimer);
			}

			objref.current.sliderTimer = setTimeout(() => {
				setTimeSlider(null);
				objref.current.timeSliderIndex = null;
			}, 15000);
		}
	}, [objref]);

	const getCPUChart = useCallback(() =>
	{
		const		cobj = objref.current[cpuTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		let		baseval1, baselineArray;

		if (objref.current.procinfo && objref.current.procinfo.p95cpupct) {
			baseval1 = objref.current.procinfo.p95cpupct;

			baselineArray = [
				{label : "Overall p95 CPU %", value : baseval1, yaxis : 1 },
			];
		}

		const 		scatterArray = getScatterArray(cpuColumns[0].col, 1, procRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={cpuRef} chartTitle={cpuTitle} columnInfoArr={cpuColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="Total CPU Utilization %" y1AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getRSSChart = useCallback(() =>
	{
		const		cobj = objref.current[rssTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		const 		scatterArray = getScatterArray(rssColumns[0].col, 1, procRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={rssRef} chartTitle={rssTitle} columnInfoArr={rssColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					scatterArray={scatterArray}
					y1AxisTitle="Resident Memory RSS MB" y1AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	


	const getCPUDelayChart = useCallback(() =>
	{
		const		cobj = objref.current[cpuDelayTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		let		baseval1, baselineArray;

		if (objref.current.procinfo && objref.current.procinfo.p95cpudel) {
			baseval1 = objref.current.procinfo.p95cpudel;

			baselineArray = [
				{label : "Overall p95 CPU Delay msec", value : baseval1, yaxis : 1 },
			];
		}

		const 		scatterArray = getScatterArray(cpuDelayColumns[0].col, 1, procRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={cpuDelayRef} chartTitle={cpuDelayTitle} columnInfoArr={cpuDelayColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="CPU Delays (msec)" y1AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	


	const getVMDelayChart = useCallback(() =>
	{
		const		cobj = objref.current[vmDelayTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		const 		scatterArray = getScatterArray(vmDelayColumns[0].col, 1, procRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={vmDelayRef} chartTitle={vmDelayTitle} columnInfoArr={vmDelayColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					scatterArray={scatterArray}
					y1AxisTitle="Virtual Memory Delays (msec)" y1AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	


	const getIODelayChart = useCallback(() =>
	{
		const		cobj = objref.current[ioDelayTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		let		baseval1, baselineArray;

		if (objref.current.procinfo && objref.current.procinfo.p95iodel) {
			baseval1 = objref.current.procinfo.p95iodel;

			baselineArray = [
				{label : "Overall p95 Block IO Delay msec", value : baseval1, yaxis : 1 },
			];
		}

		const 		scatterArray = getScatterArray(ioDelayColumns[0].col, 1, procRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={ioDelayRef} chartTitle={ioDelayTitle} columnInfoArr={ioDelayColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="Block IO Delays (msec)" y1AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getNetChart = useCallback(() =>
	{
		const		obj = objref.current[netTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(netColumns[0].col, 1, procRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={netRef} chartTitle={netTitle} columnInfoArr={netColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Network Traffic KB per 15 sec" y2AxisTitle="New TCP Connections per 15 sec" 
					y1AxisFormat="," y2AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getTimeSliderMarks = useCallback(() => {
		let		markobj = {};

		if (objref && objref.current && objref.current.summary) {
			const			statemarker = objref.current.summary.statemarker;

			if (statemarker && statemarker.length > 0) {
				for (let i = 0;  i < statemarker.length; ++i) {
					markobj[statemarker[i]] = CreateRectSvg('red', 3);
				}	
			}	

			if (objref.current.summary.starttime.length) {
				markobj[0] = moment(objref.current.summary.starttime, moment.ISO_8601).format("HH:mm:ss");
			}	

			if (objref.current.prevdatastart && objref.current.prevdatastart.length && (objref.current.summary.endtime.length)) {
				markobj[objref.current.prevdatastart.length - 1] = moment(objref.current.summary.endtime, moment.ISO_8601).format("HH:mm:ss");
			}	
		}

		return markobj;

	}, [objref]);	
	
	const getSummary = () => {
		if (forceSummary) {
			;
		}
		
		return (
			<>
			{<ProcHostSummary procid={procid} parid={parid} objref={objref} isRealTime={isRealTime} aggregatesec={isaggregated ? aggregatesec : undefined} aggroper={aggroper} 
					timeSliderIndex={timeSliderIndex !== null ? timeSliderIndex : undefined} modalCount={modalCount}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} />}
			{<h4 style={{ textAlign : 'center', marginTop : 20 }} ><em><strong>Time Range Summary Slider</strong></em></h4>}
			<div style={{ marginLeft : 70, marginRight : 100 }} >
			{<Slider marks={getTimeSliderMarks()} min={0} max={objref.current.maxSlider} 
					onChange={onTimeSliderChange} onAfterChange={onTimeSliderAfterChange} tooltipVisible={false} />}
			</div>		
			<div style={{ marginBottom: 30 }}></div>
			</>
		);
	};

	const onHistorical = useCallback((date, dateString, useAggr, aggrMin, aggrType) => {
		if (!date || !dateString) {
			return;
		}

		let			tstarttime, tendtime;

		if (safetypeof(date) === 'array') {
			if (date.length !== 2 || safetypeof(dateString) !== 'array' || false === date[0].isValid() || false === date[1].isValid()) {
				message.error(`Invalid Historical Date Range set...`);
				return;
			}	

			tstarttime = dateString[0];
			tendtime = dateString[1];
		}
		else {
			return;
		}

		const			tabKey = `ProcMonitor_${Date.now()}`;
		
		CreateTab('Process History', 
			() => { return <ProcMonitor isRealTime={false} starttime={tstarttime} endtime={tendtime} procid={procid} parid={parid} 
						aggregatesec={useAggr ? aggrMin * 60 : undefined} aggregatetype={aggrType}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [procid, parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);	

	const onStateSearch = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs) => {
		if (!date || !dateString) {
			return;
		}

		let			tstarttime, tendtime;

		if (safetypeof(date) === 'array') {
			if (date.length !== 2 || safetypeof(dateString) !== 'array' || false === date[0].isValid() || false === date[1].isValid()) {
				return `Invalid Search Historical Date Range set...`;
			}	

			tstarttime = dateString[0];
			tendtime = dateString[1];
		}
		else {
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				return `Invalid Search Historical Date set ${dateString}...`;
			}	

			tstarttime = dateString;
		}

		let			fstr;

		if (newfilter) {
			fstr = `( ({ procstate.procid = '${procid}' }) and ${newfilter} )`;
		}
		else {
			fstr = `({ procstate.procid = '${procid}' })`;
		}	


		// Now close the search modal
		Modal.destroyAll();

		procTableTab({parid, hostname : objref.current.summary.hostname, starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, 
				filter : fstr, maxrecs, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [parid, procid, addTabCB, remTabCB, isActiveTabCB, objref]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range' 
				initStart={true} showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <ProcStateMultiQuickFilter filterCB={onfiltercb} useHostFields={!parid} showquickfilter={!!parid} />;
	}, [parid]);	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			<ButtonModal buttontext={`Search Process '${objref.current.procname}' State`} width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onStateSearch} title='Search Process State' 
						timecompcb={timecb} filtercompcb={filtercb} ismaxrecs={true} defaultmaxrecs={50000} />
				)} />
					

			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			{isRealTime && realtimePaused === false && (<Button icon={<PauseCircleOutlined />} onClick={() => {objref.current.pauserealtime = true}}>Pause Auto Refresh</Button>)}
			{isRealTime && realtimePaused && (<Button icon={<PlayCircleOutlined />} onClick={() => {objref.current.resumerealtime = true}}>Resume Auto Refresh</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Process State'
					showTime={false} showRange={true} minAggrRangeMin={1} maxAggrRangeMin={60} disableFuture={true} />

			</Space>
			</div>

			</div>
			</>
		);
	};

	const getPrevCharts = (alertvar) => {
		return (
			<>
			{alertvar}
			{optionDiv()}
			<div style={{ marginBottom: 20, marginLeft: 20, marginRight: 20 }}>
			{timeSliderIndex !== null ? getSummary() : objref.current.prevsummary}
			{objref.current.prevcharts}
			</div>
			</>
		);
	};

	let		hdrtag = null, bodycont = null;

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 
		if (isRealTime) {
			hdrtag = <Tag color='green'>Running with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>;
		}
		else {
			hdrtag = <Tag color='blue'>Auto Refresh Disabled</Tag>;
		}	

		if (safetypeof(data) === 'array' && data.length > 0 && (safetypeof(data[0].procstate) === 'array') && data[0].procstate.length > 0) { 

			if (safetypeof(data[0].hostinfo) === 'object') {
				objref.current.summary.hostname 	= data[0].hostinfo.host;
				objref.current.summary.clustername	= data[0].hostinfo.cluster;
			}

			objref.current.procname	= data[0].procstate[0].name;

			let			newdata = data[0].procstate, lastsec = moment(newdata[newdata.length - 1].time, moment.ISO_8601).unix();	

			if ((moment(newdata[0].time, moment.ISO_8601).unix() >= moment(objref.current.summary.starttime, moment.ISO_8601).unix()) && 
				(lastsec <= moment(objref.current.summary.endtime, moment.ISO_8601).unix())) {

				console.log(`Duplicate record seen...`);
				objref.current.nerrorretries = 0

				bodycont = getPrevCharts(<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);
			}
			else {

				if (isaggregated) {
					newdata = setAggrDataState(newdata);
				}

				if (isRealTime) {
					fixedArrayAddItems(newdata, objref.current.realtimearray, fixedArraySize);
					calcSummary(objref.current.realtimearray, objref.current.summary, isaggregated);
				}
				else {
					calcSummary(newdata, objref.current.summary, isaggregated);
				}

				/*console.log(`Summary is ${JSON.stringify(objref.current.summary)}`);*/

				const		cpuvalid = getChartSeries(objref.current[cpuTitle].chartobj_[0], newdata, isRealTime);
				const		cpuchart = cpuvalid === true ? getCPUChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing CPU chart : ${cpuvalid}`} />);
		

				const		rssvalid = getChartSeries(objref.current[rssTitle].chartobj_[0], newdata, isRealTime);
				const		rsschart = rssvalid === true ? getRSSChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing RSS chart : ${rssvalid}`} />);
		

				const		cpudelayvalid = getChartSeries(objref.current[cpuDelayTitle].chartobj_[0], newdata, isRealTime);
				const		cpudelaychart = cpudelayvalid === true ? getCPUDelayChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing CPU Delay chart : ${cpudelayvalid}`} />);
		

				const		vmdelayvalid = getChartSeries(objref.current[vmDelayTitle].chartobj_[0], newdata, isRealTime);
				const		vmdelaychart = vmdelayvalid === true ? getVMDelayChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing VM Delay chart : ${vmdelayvalid}`} />);
		

				const		iodelayvalid = getChartSeries(objref.current[ioDelayTitle].chartobj_[0], newdata, isRealTime);
				const		iodelaychart = iodelayvalid === true ? getIODelayChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing IO Delay chart : ${iodelayvalid}`} />);
		

				const		netkbvalid = getChartSeries(objref.current[netTitle].chartobj_[0], newdata, isRealTime, true);
				const		connvalid = netkbvalid === true && getChartSeries(objref.current[netTitle].chartobj_[1], newdata, isRealTime, false);
				const		netvalid = netkbvalid === true ? connvalid : netkbvalid;
				const		netchart = netvalid === true ? getNetChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Network Traffic chart : ${netvalid}`} />);


				let		darr;

				if (isRealTime) {
					darr = objref.current.realtimearray;
				}
				else {
					darr = newdata;
				}	

				objref.current.maxSlider	= darr.length;
				objref.current.prevsummary 	= getSummary(darr.length);

				objref.current.prevcharts = (
					<>
					{cpuchart}
					{rsschart}
					{cpudelaychart}
					{vmdelaychart}
					{iodelaychart}
					{netchart}
					</>
				);

				bodycont = (
					<>
					<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />
					{optionDiv()}
					<div style={{ marginBottom: 20, marginLeft: 20, marginRight: 20 }}>
					{objref.current.prevsummary}
					{objref.current.prevcharts}
					</div>
					</>)

				if (objref.current.prevdata) {
					objref.current.updtracker = newdata[newdata.length - 1].time;
				}

				objref.current.prevdata = data;
				objref.current.prevdatastart = darr;
				objref.current.prevdatasec = lastsec;

				objref.current.nerrorretries = 0

				console.log(`Process ${objref.current.procname} State Data seen for time ${newdata[0].time}`);
			}

			/*console.log(`Process State Data seen : data.length = ${data[0].procstate.length} ${JSON.stringify(data[0].procstate).slice(0, 256)}`);*/
		}
		else {
			let		ignerr= false;

			if (objref.current.prevdatasec && moment().unix() - objref.current.prevdatasec < 60) {
				ignerr = true;
			}

			bodycont = getPrevCharts(<Alert style={{ visibility: ignerr ? "hidden" : undefined }} type="warning" showIcon 
								message="Invalid or no data seen. Will retry after a few seconds..." />);

			console.log(`Process State Data Invalid / No data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
			
			if (objref.current.nerrorretries++ < 10) {
				objref.current.nextfetchtime = Date.now() + fetchIntervalmsec;
			}
			else {
				objref.current.nextfetchtime = Date.now() + 30000;
			}	
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getPrevCharts(<Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Process State Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);

			objref.current.nextfetchtime = Date.now() + 30000;
		}
		else if (isloading) {
			hdrtag = <Tag color='blue'>Loading Data</Tag>;

			bodycont = getPrevCharts(<Alert type="info" showIcon message="Loading Data..." />);
		}
		else {
			if (isRealTime) {
				hdrtag = <Tag color='green'>Running with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>;
			}
			else {
				hdrtag = <Tag color='blue'>Auto Refresh Disabled</Tag>;
			}	

			bodycont = getPrevCharts(<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);
		}	
	}

	let 	drilltag = null;
	
	if (realtimePaused) {
		drilltag = <Tag color='cyan'>Auto Refresh Paused due to {objref.current.isdrilldown ? 'Chart drilldown' : (timeSliderIndex !== null) ? 'Time Slider' : 
				objref.current.pauserealtime ? 'User Initiated Pause' : 'inactive Tab'}</Tag>;
	}	

	const 	hdrtagall=<>{hdrtag}{drilltag}</>;

	return (
		<>
		<div style={{ marginLeft : 10, marginTop : 10, marginRight : 10 }} >

		<Title level={4}><em>Process {isaggregated ? "Aggregated" : ""} State Monitor</em></Title>
		{hdrtagall}

		<div style={{ marginTop: 10, padding: 10 }}>

			<ErrorBoundary>
			{bodycont}
			</ErrorBoundary>

		</div>

		</div>
		</>

	);
}	

