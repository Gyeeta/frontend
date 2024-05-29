
import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import moment from 'moment';
import axios from 'axios';

import {Button, Space, Slider, Modal, Descriptions, Statistic, Typography, Tag, Alert, notification, message} from 'antd';
import {PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';

import {format} from "d3-format";

import './hostViewPage.css';

import {NodeApis} from './components/common.js';
import {ColumnInfo, fixedSeriesAddItems, getTimeEvent, getTimeSeries, stateColorStyle, stateScatterRadius, getScatterObj, GyLineChart} from './components/gyChart.js';
import {safetypeof, getStateColor, usecStrFormat, kbStrFormat, MBStrFormat, validateApi, CreateRectSvg, ComponentLife, fixedArrayAddItems, 
	CreateTab, ButtonModal, arrayFilter} from './components/util.js';
import {ProcInfoDesc, procTableTab} from './procDashboard.js';
import {NetDashboard} from './netDashboard.js';
import {HostInfoDesc} from './hostViewPage.js';
import {svcTableTab, SvcStateMultiQuickFilter, SvcModalCard, hostAggrCol, hostRangeCol} from './svcDashboard.js';
import {cpumemTableTab} from './cpuMemPage.js';
import {GyTable, getTableScroll} from './components/gyTable.js';
import {TimeRangeAggrModal} from './components/dateTimeZone.js';
import {SearchTimeFilter, SearchWrapConfig} from './multiFilters.js';

const { ErrorBoundary } = Alert;
const { Title } = Typography;

export const SvcIssueSource = [
	{ name : "No Issue", 				value : 0 },
	{ name : "Listener Process Issue",  		value : 1 },
	{ name : "High Queries/sec (QPS)", 		value : 2 },
	{ name : "High Active Connections count", 	value : 3 },
	{ name : "Server Errors", 			value : 4 },
	{ name : "Host CPU Issue", 			value : 5 },
	{ name : "Host Virtual Memory Issue", 		value : 6 },
	{ name : "Dependent Listener Issue", 		value : 7 },
	{ name : "Issue Source cannot be determined", 	value : 8 },
];

const fixedArraySize 	= 200;
const realtimesec 	= 5;

const qpsTitle 		= "Queries/sec (QPS) vs Server Errors";
const respTitle		= "Avg and p95 5 sec Response vs p95 5 min Response in msec";
const connTitle		= "Active Connections vs Total Connections per 15 sec";
const netTitle 		= "Network Inbound vs Network Outbound per 15 sec in KB";
const cpuiodelayTitle 	= "Process CPU Delays in usec vs Block IO Delays in usec";
const vmdelayRssTitle 	= "Process Virtual Memory Delays in usec vs Resident Memory in MB";
const cpuTitle		= "Process User vs System CPU %";

const svcStateCol 	= new ColumnInfo("state", "Bad Service State", getStateColor("Bad"), 1, "", true /* isextra */, true /* enableLegend */, false /* isnumber */,
					(event, val) => { return { fill : getStateColor(val) } }); 

const qpsColumns	= [
	new ColumnInfo("qps5s", "Queries/sec (QPS)", "pink", 1, ","), 
	svcStateCol,
	new ColumnInfo("sererr", "Server Errors", "orange", 2, ","), 
];

const respColumns 	= [
	new ColumnInfo("p95resp5s", "p95 5 sec Response msec", "orange", 1, ",.0f"), 
	new ColumnInfo("resp5s", "Avg 5 sec Response msec", "steelblue", 1, ",.0f"), 
	svcStateCol,
	new ColumnInfo("p95resp5m", "p95 5 min Response msec", "pink", 2, ",.0f"), 
];

const connColumns	= [
	new ColumnInfo("nactive", "Active TCP Connections per 15 sec", "DarkSalmon", 1, ","), 
	svcStateCol,
	new ColumnInfo("nconns", "Total TCP Connections", "orange", 2, ","), 
];

const netColumns	= [
	new ColumnInfo("kbin15s", "Network Inbound KB per 15 sec", "DarkSeaGreen", 1, ","), 
	svcStateCol,
	new ColumnInfo("kbout15s", "Network Outbound KB per 15 sec", "orange", 2, ","), 
];

const cpuiodelayColumns	= [
	new ColumnInfo("cpudelus", "CPU Delays usec", "orange", 1, ","), 
	svcStateCol,
	new ColumnInfo("iodelus", "Block IO Delays usec", "steelblue", 2, ","), 
];

const vmdelayRssColumns	= [
	new ColumnInfo("vmdelus", "Memory Delays usec", "pink", 1, ","), 
	svcStateCol,
	new ColumnInfo("rssmb", "Resident Memory in MB", "cyan", 2, ","), 
];


const cpuColumns 	= [
	new ColumnInfo("usercpu", "Listener Process User CPU %", "DarkSeaGreen", 1, ",.0f"), 
	svcStateCol,
	new ColumnInfo("syscpu", "Listener Process System CPU %", "orange", 2, ",.0f"), 
];

const svcScatterStyle 	= (column, event) => { return stateColorStyle(column, event, "state") };
const svcRadiusCb 	= (column, event) => { return stateScatterRadius(column, event, "state", true) };

function getScatterArray(piggybackCol, yaxis, radiusCb)
{ 
	return [
		getScatterObj("state", yaxis, svcScatterStyle, radiusCb, ".0f", "rect", piggybackCol),
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

	summary.svcbadsevere		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.issuesourcearr		= new Array(SvcIssueSource.length);

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
			if ((item.svcissue > 0) && (item.svcissue * 10 >= item.inrecs)) {
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
					if (summary.svcbadsevere.nrecs === 0) {
						summary.svcbadsevere.firstidx = i;
					}	

					summary.svcbadsevere.nrecs++;
					summary.svcbadsevere.lastidx = i;

					statemarker = true;
				}	

				if ((item.issue > 0) && (item.issue < SvcIssueSource.length)) {
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

				if (item.svcissue > 0) {
					if (summary.svcbadsevere.nrecs === 0) {
						summary.svcbadsevere.firstidx = i;
					}	

					summary.svcbadsevere.nrecs += item.svcissue;
					summary.svcbadsevere.lastidx = i;

					statemarker = true;

					if (item.inproc > 0) {
						const		sobj = summary.issuesourcearr[1];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inproc;
						sobj.lastidx = i;
					}	
					if (item.inqps > 0) {
						const		sobj = summary.issuesourcearr[2];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inqps;
						sobj.lastidx = i;
					}	

					if (item.inaconn > 0) {
						const		sobj = summary.issuesourcearr[3];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inaconn;
						sobj.lastidx = i;
					}	
					if (item.inhttperr > 0) {
						const		sobj = summary.issuesourcearr[4];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inhttperr;
						sobj.lastidx = i;
					}	

					if (item.inoscpu > 0) {
						const		sobj = summary.issuesourcearr[5];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inoscpu;
						sobj.lastidx = i;
					}	
					if (item.inosmem > 0) {
						const		sobj = summary.issuesourcearr[6];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inosmem;
						sobj.lastidx = i;
					}	
					if (item.indepsvc > 0) {
						const		sobj = summary.issuesourcearr[7];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.indepsvc;
						sobj.lastidx = i;
					}	
					if (item.inunknown > 0) {
						const		sobj = summary.issuesourcearr[8];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inunknown;
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

function SvcHostSummary({parid, objref, isRealTime, aggregatesec, aggroper, timeSliderIndex, modalCount, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile, iscontainer})
{
	const 			summary = objref.current.summary;	
	const			isaggregated = (aggregatesec !== undefined);
	const			svcid = objref.current.svcid;
	const			svcinfo = objref.current.svcinfo;
	const			avgstr = (isaggregated ? "Aggr " : "");
	let			procidarr, getProcInfo, relsvcid = svcinfo?.relsvcid;

	const title = (<div style={{ textAlign : 'center' }}><Title level={4}>Summary for Service <em>{objref.current.svcname}</em> of Host <em>{summary.hostname}</em></Title></div>);

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
		ltime = `Statistics at time ${lastitem.time}`;
	}	
	else {
		ltime = 'Last Seen Statistics';
	}	

	const lasttitle = (<div style={{ textAlign : 'center', marginTop: 20 }}><span style={{ fontSize: 16 }}> 
				<em><strong>Time Range {aggregatesec ? `${aggregatesec/60} min ${aggroper} Aggregated` : ""} {ltime}</strong></em></span></div>);

	if (objref.current.svcprocmap?.procidarr && objref.current.svcprocmap.procidarr.length > 0) {
		// Max 32 diff Aggr Proc Infos
		procidarr = objref.current.svcprocmap.procidarr.split(',', 32);
		const starttime = (lastitem && lastitem.time ? lastitem.time : undefined);

		if (procidarr.length) {
			const getContArr = () => {
				return procidarr.map((rec, index) => ( <ProcInfoDesc procid={rec} parid={parid} starttime={starttime} key={index} isTabletOrMobile={isTabletOrMobile} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} /> ));
			};

			getProcInfo = () => {
				Modal.info({
					title : <span><strong>{procidarr.length === 32 ? 'Max 32' : ''} Grouped Processes for Service {objref.current.svcname} : Total {procidarr.length} </strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						{getContArr()}
						</>
						),
						
					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
				});
			};	
		}
	}

	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Service Host Info</strong></span>,
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

	const getProcStateTable = (linktext, filter, tstart, tend, useAggr) => {
		let			fstr = filter ? `${filter} and ` : '';

		if (procidarr && procidarr.length < 32) {
			fstr += '{ procid in ';

			for (let procid of procidarr) {
				fstr += `'${procid}',`;
			}	

			fstr += ' }';
		}
		else if (relsvcid) {
			fstr += `{ relsvcid = '${relsvcid}' }`;
		}	
		else {
			return null;
		}	
		
		return <Button type='dashed' onClick={() => {
			procTableTab({parid : parid, starttime : tstart, endtime : tend, useAggr, aggrMin : 365 * 24 * 60,
					filter : fstr, name : `Service ${objref.current.svcname}`, maxrecs : 10000,
					addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const tableOnRow = (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Service {record.name} State</strong></span>,
					content : (
						<>
						<SvcModalCard rec={record} parid={parid} 
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
					<ComponentLife stateCB={modalCount} />
					<GyTable columns={isaggregated ? hostAggrCol(aggroper) : hostRangeCol} onRow={tableOnRow} 
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
				label={<em>Service Gyeeta ID</em>}>
				<span style={{ fontSize: 12 }}><em>{svcid}</em></span>
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

			{svcinfo && <Descriptions.Item label={<em>Service Start Time</em>}>{svcinfo.tstart}</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Listener IP</em>}>{svcinfo.ip}</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Listener Port</em>}>{svcinfo.port}</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Process Command Line</em>}>{svcinfo.cmdline}</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Region Name</em>}>{svcinfo.region}</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Zone Name</em>}>{svcinfo.zone}</Descriptions.Item>}
			{svcinfo && !iscontainer && svcinfo.svcport1 !== 0 && <Descriptions.Item label={<em>Virtual IP</em>}>{svcinfo.svcip1}</Descriptions.Item>}
			{svcinfo && !iscontainer && svcinfo.svcport1 !== 0 && <Descriptions.Item label={<em>Virtual Port</em>}>{svcinfo.svcport1}</Descriptions.Item>}
			{svcinfo && !iscontainer && svcinfo.svcport2 !== 0 && <Descriptions.Item label={<em>2nd Virtual IP</em>}>{svcinfo.svcip2}</Descriptions.Item>}
			{svcinfo && !iscontainer && svcinfo.svcport2 !== 0 && <Descriptions.Item label={<em>2nd Virtual Port</em>}>{svcinfo.svcport2}</Descriptions.Item>}
			{svcinfo && !iscontainer && svcinfo.svcdns.length > 0 && <Descriptions.Item label={<em>Domain Name</em>}>{svcinfo.svcdns}</Descriptions.Item>}
			{svcinfo && !iscontainer && svcinfo.svctag.length > 0 && <Descriptions.Item label={<em>Service Tag</em>}>{svcinfo.svctag}</Descriptions.Item>}
			{getProcInfo && <Descriptions.Item label={<em>Process Info</em>}><Button type='dashed' onClick={getProcInfo} >Get Process Info</Button></Descriptions.Item>}
			{getProcInfo && <Descriptions.Item label={<em>Process States for duration</em>}>
				{getProcStateTable('Service Process States', '', summary.starttime, summary.endtime, true)}					
			</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Current 5 Day p95 Response</em>}>{format(",")(svcinfo.p95resp5d)} msec</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Current 5 Day Avg. Response</em>}>{format(",")(svcinfo.avgresp5d)} msec</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Current p95 QPS</em>}>{format(",")(svcinfo.p95qps)}</Descriptions.Item>}
			{svcinfo && !iscontainer && <Descriptions.Item label={<em>Current p95 Active Conns</em>}>{format(",")(svcinfo.p95aconn)}</Descriptions.Item>}

			<Descriptions.Item 
				label={<em># Bad States</em>}>
				<Space>

				{summary.svcbadsevere.nrecs > 0 ? createLinkModal((
					<>
					{CreateRectSvg('red')}
					<span style={{ fontSize: 14 }}><em>&nbsp; {summary.svcbadsevere.nrecs} </em></span>
						{!isTabletOrMobile && <span style={{ fontSize: 12 }}><em>&nbsp; / {summary.nrecs}</em></span>}
					</>
					), 'Service Issue', 
					(item) => (item.state === 'Bad' || item.state === 'Severe' || item.svcissue > 0), 
					summary.svcbadsevere.firstidx, summary.svcbadsevere.lastidx + 1, summary.svcbadsevere.nrecs,
				) : `0 / ${summary.nrecs}`}

				</Space>
			</Descriptions.Item>

			{summary.issuesourcearr[1] && summary.issuesourcearr[1].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Process Issues</em>}>

				{summary.issuesourcearr[1].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[1].nrecs} />
					), 'Process Issues', 
					(item) => ((!isaggregated && item.issue === 1) || (isaggregated && item.inproc > 0)), 
						summary.issuesourcearr[1].firstidx, summary.issuesourcearr[1].lastidx + 1, summary.issuesourcearr[1].nrecs,
					() => {
						return (
						<>
						<Space>
						{getProcStateTable('Get Service Process(es) with issues', `{ state in 'Bad','Severe' }`,
							summary.dataarr[summary.issuesourcearr[1].firstidx]?.time, summary.dataarr[summary.issuesourcearr[1].lastidx]?.time)}					
						</Space>
						</>
						);}
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[2] && summary.issuesourcearr[2].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by high QPS</em>}>
				{summary.issuesourcearr[2].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[2].nrecs} />
					), 'High Queries/sec (QPS)', 
					(item) => ((!isaggregated && item.issue === 2) || (isaggregated && item.inqps > 0)), 
						summary.issuesourcearr[2].firstidx, summary.issuesourcearr[2].lastidx + 1, summary.issuesourcearr[2].nrecs
					) : 0}				
			</Descriptions.Item>
			}

			{summary.issuesourcearr[3] && summary.issuesourcearr[3].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by high Active Conns</em>}>
				{summary.issuesourcearr[3].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[3].nrecs} />
					), 'High Active Connection Count', 
					(item) => ((!isaggregated && item.issue === 3) || (isaggregated && item.inaconn > 0)), 
						summary.issuesourcearr[3].firstidx, summary.issuesourcearr[3].lastidx + 1, summary.issuesourcearr[3].nrecs
					) : 0}				
			</Descriptions.Item>
			}

			{summary.issuesourcearr[4] && summary.issuesourcearr[4].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Server Errors</em>}>
				{summary.issuesourcearr[4].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[4].nrecs} />
					), 'Server Errors', 
					(item) => ((!isaggregated && item.issue === 4) || (isaggregated && item.inhttperr > 0)), 
						summary.issuesourcearr[4].firstidx, summary.issuesourcearr[4].lastidx + 1, summary.issuesourcearr[4].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[5] && summary.issuesourcearr[5].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Host CPU Issues</em>}>
				{summary.issuesourcearr[5].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[5].nrecs} />
					), 'Host CPU Issues', 
					(item) => ((!isaggregated && item.issue === 5) || (isaggregated && item.inoscpu > 0)), 
						summary.issuesourcearr[5].firstidx, summary.issuesourcearr[5].lastidx + 1, summary.issuesourcearr[5].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[6] && summary.issuesourcearr[6].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Host Memory Issues</em>}>
				{summary.issuesourcearr[6].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[6].nrecs} />
					), 'Host Memory Issues', 
					(item) => ((!isaggregated && item.issue === 6) || (isaggregated && item.inosmem > 0)), 
						summary.issuesourcearr[6].firstidx, summary.issuesourcearr[6].lastidx + 1, summary.issuesourcearr[6].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[7] && summary.issuesourcearr[7].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by upstream Dependent Services</em>}>
				{summary.issuesourcearr[7].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[7].nrecs} />
					), 'Dependent Service Issues', 
					(item) => ((!isaggregated && item.issue === 7) || (isaggregated && item.indepsvc > 0)), 
						summary.issuesourcearr[7].firstidx, summary.issuesourcearr[7].lastidx + 1, summary.issuesourcearr[7].nrecs
					) : 0}
			</Descriptions.Item>
			}

			{summary.issuesourcearr[8] && summary.issuesourcearr[8].nrecs && 
			<Descriptions.Item 
				label={<em># Degrades by Unknown Reasons</em>}>
				{summary.issuesourcearr[8].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.issuesourcearr[8].nrecs} />
					), 'Unknown Issue Source', 
					(item) => ((!isaggregated && item.issue === 8) || (isaggregated && item.inunknown > 0)), 
						summary.issuesourcearr[8].firstidx, summary.issuesourcearr[8].lastidx + 1, summary.issuesourcearr[8].nrecs
					) : 0}
			</Descriptions.Item>
			}

		</Descriptions>

		{ lastitem && !iscontainer && (

			<Descriptions title={lasttitle} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >

			<Descriptions.Item 
				label={<em>{!ismid && `Last`} {avgstr} Service State</em>}>
				{CreateRectSvg(getStateColor(lastitem.state))}
				<span> {lastitem.state} </span>
			</Descriptions.Item>

			{isaggregated &&
			<Descriptions.Item 
				label={<em># Bad States</em>}>
				{lastitem.issue} / {lastitem.inrecs}
			</Descriptions.Item>
			}

			<Descriptions.Item 
				label={<em>{avgstr} Queries/sec QPS</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.qps5s)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Avg 5 sec Response</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.resp5s)} suffix="msec" />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>p95 5 sec Response</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.p95resp5s)} 
					suffix={<><span> msec </span><span style={{ fontSize: 10 }}><em> 5 min p95 {lastitem.p95resp5m} msec</em></span></>} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} 5 sec # Queries</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.nqry5s)} />
			</Descriptions.Item>


			<Descriptions.Item 
				label={<em>{avgstr} Active TCP Connections</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.nactive)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Total TCP Connections</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.nconns)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Network Inbound per 15 sec</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={kbStrFormat(lastitem.kbin15s)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Network Outbound per 15 sec</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={kbStrFormat(lastitem.kbout15s)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Server Errors</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.sererr)} />
			</Descriptions.Item>
				
			<Descriptions.Item 
				label={<em>{avgstr} Client Errors</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.clierr)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Listener Process Delays</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={usecStrFormat(lastitem.delayus)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Process CPU Delays</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={usecStrFormat(lastitem.cpudelus)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Process BlkIO Delays</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={usecStrFormat(lastitem.iodelus)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Process Memory Delays</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={usecStrFormat(lastitem.vmdelus)} />
			</Descriptions.Item>


			<Descriptions.Item 
				label={<em>Listener Process User CPU</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.usercpu)} suffix="%" />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Process System CPU</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.syscpu)} suffix="%" />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Process Resident Memory</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={MBStrFormat(lastitem.rssmb)} />
			</Descriptions.Item>
			
			{ isaggregated === false && 
			<Descriptions.Item 
				label={<em># Listener Processes</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.nprocs)} /> 
			</Descriptions.Item>
			}

			{ isaggregated === false && 
			<Descriptions.Item 
				label={<em># Processes with Issues</em>} span={4}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.nissue)} />
			</Descriptions.Item>
			}

			{ isaggregated === false && 
			<Descriptions.Item 
				label={<em>Analysis of Service State</em>} span={4}>
				<span style={{ fontSize: 14 }}><em>{lastitem.desc}</em></span> 
			</Descriptions.Item>
			}

			</Descriptions>
			)
		}	

		</>

	);		
}

export function SvcMonitor({svcid, parid, isRealTime, starttime, endtime, aggregatesec, aggregatetype, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile, iscontainer, pauseUpdateCb})
{
	const 		objref = useRef(null);
	const		qpsRef = useRef(null), respRef = useRef(null), connRef = useRef(null), netRef = useRef(null), cpuiodelayRef = useRef(null), 
			vmdelayRssRef = useRef(null), cpuRef = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[realtimePaused, setrealtimePaused] = useState(false);
	const		[isaggregated, ] = useState(aggregatesec ? aggregatesec >= 2 * realtimesec : false);
	const		[aggroper, ] = useState(aggregatetype ?? "avg");
	const		[fetchIntervalmsec, ] = useState((isaggregated ? aggregatesec * 1000 : realtimesec * 1000));
	const		[timeSliderIndex, setTimeSlider] = useState(null);
	const		[forceSummary, setForceSummary] = useState(false);

	if (objref.current === null) {
		console.log(`SvcMonitor initializing for first time : isRealTime=${isRealTime} starttime=${starttime} endtime=${endtime} aggregatesec=${aggregatesec} aggregatetype=${aggregatetype}`);

		objref.current = {
			isstarted 		: false,
			niter			: 0,
			isdrilldown		: false,
			updtracker		: null,
			nextfetchtime		: Date.now(),
			nerrorretries		: 0,
			modalCount		: 0,
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
			svcid			: svcid,
			svcname			: '',
		};	

		objref.current[qpsTitle] 		= new ChartInfo(qpsTitle, qpsColumns); 	
		objref.current[respTitle] 		= new ChartInfo(respTitle, respColumns); 	
		objref.current[connTitle] 		= new ChartInfo(connTitle, connColumns); 	
		objref.current[netTitle] 		= new ChartInfo(netTitle, netColumns); 	
		objref.current[cpuiodelayTitle] 	= new ChartInfo(cpuiodelayTitle, cpuiodelayColumns); 	
		objref.current[vmdelayRssTitle]		= new ChartInfo(vmdelayRssTitle, vmdelayRssColumns); 	
		objref.current[cpuTitle] 		= new ChartInfo(cpuTitle, cpuColumns); 	

		objref.current.realtimearray	=	[];

		objref.current.summary 		= {
			hostname		: '',
			clustername		: '',
			dataarr			: null,
		};	

		objref.current.svcinfo		= null;
		objref.current.svcprocmap	= null;

		initSummary(objref.current.summary);
	}

	useEffect(() => {
		return () => {
			console.log(`SvcMonitor destructor called...`);
		};	
	}, []);

	const validProps = useMemo(() => {	

		if (!svcid) {
			throw new Error(`Mandatory svcid not specified`);
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
	}, [svcid, parid, isRealTime, starttime, endtime]);	

	if (validProps === false) {
		// This should not occur
		throw new Error(`Internal Error : SvcMonitor validProps check failed`);
	}	

	useEffect(() => {
		console.log(`starttime/endtime Changes seen`);

		objref.current.nextfetchtime = Date.now();
		objref.current.isstarted = false;
		objref.current.svcinfo = null;
	}, [starttime, endtime, objref]);

	
	const setPauseUpdateCb = useCallback(() => {
		let		isact = true;

		if (typeof pauseUpdateCb !== 'function') {
			return;
		}

		if (tabKey && typeof isActiveTabCB === 'function') {
			isact = isActiveTabCB(tabKey);
		}

		if (objref.current.isdrilldown || (false === isact) || (objref.current.timeSliderIndex !== null) || (objref.current.modalCount > 0)) {
			pauseUpdateCb(true);
		}	
		else {
			pauseUpdateCb(false);
		}	
		
	}, [objref, pauseUpdateCb, tabKey, isActiveTabCB]);	

	const modalCount = useCallback((isup) => {
		if (isup === true) {
			objref.current.modalCount++;
		}	
		else if (isup === false && objref.current.modalCount > 0) {
			objref.current.modalCount--;
		}	

		setPauseUpdateCb();

	}, [objref, setPauseUpdateCb]);	

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		conf, currtime = Date.now(), isstart = false;

				if (currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted)) {
					return;
				}

				if (isRealTime || !objref.current.isstarted) {
					let		isact = true;

					if (tabKey && typeof isActiveTabCB === 'function') {
						isact = isActiveTabCB(tabKey);
					}

					if (objref.current.resumerealtime === true) {
						if (qpsRef && qpsRef.current) {
							qpsRef.current.setResetZoom();
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
					url 		: NodeApis.svcstate, 
					method 		: 'post', 
					data 		: { 
						parid 		: parid,
						timeoutsec 	: isRealTime && !isaggregated ? 10 : 100,
						options		: {
							aggregate	: isaggregated, 
							aggrsec		: isaggregated ? aggregatesec : undefined,
							aggroper	: aggroper,
							filter		: `{ svcstate.svcid = '${svcid}' }`,
							sortcolumns	: isaggregated ? [ "time" ] : undefined,
						},	
						timeoffsetsec	: isRealTime && isaggregated ? aggregatesec : undefined,
					}, 
					timeout 	: isRealTime && !isaggregated ? 10000 : 100000,
				};

				if (!isRealTime) {
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
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Service State Data fetch..."});
					objref.current.nerrorretries++;
				}	

				if (isstart) {
					objref.current.isstarted = true;
				}	
			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new Service State data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				objref.current.nerrorretries++;
				objref.current.nextfetchtime = Date.now() + 30000;
			}	
			finally {
				timer1 = setTimeout(apiCall, 1000);
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for SvcMonitor setinterval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, svcid, parid, isRealTime, starttime, endtime, fetchIntervalmsec, aggroper, aggregatesec, isaggregated, tabKey, isActiveTabCB, qpsRef]);	
	
	// svcInfo and svcProcMap effect	
	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				if (isRealTime) {
					let		isact = true;

					if (tabKey && typeof isActiveTabCB === 'function') {
						isact = isActiveTabCB(tabKey);
					}

					if (objref.current.isdrilldown || (false === isact)) {
						return;
					}	
				}
				else if (objref.current.svcinfo !== null) {
					return;
				}	

				const			conf = { 
					url 		: NodeApis.multiquery, 
					method 		: 'post', 
					data 		: { 
						parid 		: parid,
						starttime	: (!isRealTime ? starttime : undefined),
						timeoutsec 	: 100,
						multiqueryarr	: [
							{
								qid 		: 'info', 
								qname 		: 'svcInfo',
								filter		: `{ svcinfo.svcid = '${svcid}' }`,
							},
							{
								qid 		: 'procmap', 
								qname 		: 'svcProcMap',
								filter		: `{ svcprocmap.svcidarr substr '${svcid}' }`,
							},	
						],
					}, 
					timeout 	: 100000,
				};

				console.log(`Fetching next interval svcinfo/svcprocmap data...for config ${JSON.stringify(conf)}`);

				let 		res = await axios(conf);

				validateApi(res.data);

				if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && 
					((safetypeof(res.data[0].info) === 'object') && (safetypeof(res.data[0].info.svcinfo) === 'array') && res.data[0].info.svcinfo[0]) && 
					(safetypeof(res.data[0].procmap) === 'object') && (safetypeof(res.data[0].procmap.svcprocmap) === 'array') && res.data[0].procmap.svcprocmap[0]) { 

					objref.current.svcinfo 		= res.data[0].info.svcinfo[0];
					objref.current.svcprocmap 	= res.data[0].procmap.svcprocmap[0];

					if (!isRealTime) {
						setForceSummary((oldval) => !oldval);
					}	
				}
				else {
					if (objref.current.prevdatasec > 0) {
						notification.warning({message : "Service Info Data Format", description : "No Data or Invalid Data for Service Info fetch..."});
					}	
				}	
			}
			catch(e) {
				notification.error({message : "Service Info Data Fetch Exception Error", 
							description : `Exception occured while waiting for new Service Info data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response of Service Info : ${e}\n${e.stack}\n`);
			}	
			finally {
				// Repeat every 5.5 min
				timer1 = setTimeout(apiCall, 5 * 60 * 1000 + 30000);
			}
		}, 0);

		return () => { 
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, svcid, parid, isRealTime, starttime, tabKey, isActiveTabCB, setForceSummary]);	
	
	const getNetFlows = useCallback((cref) => {
		const			tstart = moment(cref.current?.getRescaleTimerange()[0]).format();
		const			tend = moment(cref.current?.getRescaleTimerange()[1]).format();
		
		console.log(`tstart for getNetFlows is ${tstart} tend is ${tend}`);

		const		tabKey = `NetFlow_${svcid}_${tstart}_${tend}}`;
		
		return CreateTab('Network Flows', 
					() => { return <NetDashboard svcid={svcid} svcname={objref.current.svcname} parid={parid} autoRefresh={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);

	}, [objref, svcid, parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);

	const qpsRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>
			<Button onClick={(e) => getNetFlows(qpsRef)}> Get Network Flows </Button>
			</Space>
			</>
		);
	}, [qpsRef, getNetFlows]);	

	const respRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>
			<Button onClick={(e) => getNetFlows(respRef)}> Get Network Flows </Button>
			</Space>
			</>
		);
	}, [ respRef, getNetFlows ]);	

	const connRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>
			<Button onClick={(e) => getNetFlows(connRef)}> Get Network Flows </Button>
			</Space>
			</>
		);
	}, [connRef, getNetFlows]);	

	const netRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>
			<Button onClick={(e) => getNetFlows(netRef)}> Get Network Flows </Button>
			</Space>
			</>
		);
	}, [netRef, getNetFlows]);	

	const cpuiodelayRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!cpuiodelayRef.current) return;

					const			tref = cpuiodelayRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ cpudel + iodel > 0 }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get All Host Processes with CPU/IO Delays</Button>
			
			
			<Button onClick={() => {
					if (!cpuiodelayRef.current) return;

					const			tref = cpuiodelayRef;

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
	}, [cpuiodelayRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	


	const vmdelayRssRescaleComps = useMemo(() => {
		return (
			<>
			<Button onClick={() => {
					if (!vmdelayRssRef.current) return;

					const			tref = vmdelayRssRef;

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
					if (!vmdelayRssRef.current) return;

					const			tref = vmdelayRssRef;

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
			
			
			</>
		);
	}, [vmdelayRssRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const cpuRescaleComps = useMemo(() => {
		return (
			<>
			</>
		);
	}, [/* cpuRef */]);	


	const onRescaleComps = useCallback((title, isrescale) => {

		console.log(`title = ${title} onRescaleComps : isrescale = ${isrescale}`);

		objref.current.isdrilldown = isrescale;

		setPauseUpdateCb();

		if (isrescale === false) {
			return null;
		}	

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		switch (title) {

			case qpsTitle 		: return qpsRescaleComps;

			case respTitle 		: return respRescaleComps;

			case connTitle		: return connRescaleComps;

			case netTitle 		: return netRescaleComps;

			case cpuiodelayTitle	: return cpuiodelayRescaleComps;

			case vmdelayRssTitle	: return vmdelayRssRescaleComps;
			
			case cpuTitle		: return cpuRescaleComps;

			default			: return null;
		}
	}, [objref, qpsRescaleComps, respRescaleComps, connRescaleComps, netRescaleComps, cpuiodelayRescaleComps, vmdelayRssRescaleComps, cpuRescaleComps, setPauseUpdateCb]);

	const getRefFromTitle = useCallback((title) => {
		switch (title) {
			
			case qpsTitle 		:	return qpsRef;

			case respTitle		:	return respRef;

			case connTitle		:	return connRef;

			case netTitle		: 	return netRef;

			case cpuiodelayTitle	: 	return cpuiodelayRef;

			case vmdelayRssTitle	: 	return vmdelayRssRef;

			case cpuTitle		: 	return cpuRef;

			default			:	return null;
		};	

	}, [qpsRef, respRef, connRef, netRef, cpuiodelayRef, vmdelayRssRef, cpuRef]);	

	const timeRangeCB = useCallback((title, newtimerange) => {

		console.log(`title = ${title} New Timerange CB : newtimerange = ${newtimerange}`);

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		[qpsTitle, respTitle, connTitle, netTitle, cpuiodelayTitle, vmdelayRssTitle, cpuTitle].forEach((item) => {
			if (item !== title) {
				const		ref = getRefFromTitle(item);

				if (ref && ref.current) {
					ref.current.setNewTimeRange(newtimerange);
				}
			}	
		});	

	}, [getRefFromTitle]);

	const timeTrackerCB = useCallback((newdate) => {

		[qpsTitle, respTitle, connTitle, netTitle, cpuiodelayTitle, vmdelayRssTitle, cpuTitle].forEach((item) => {
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

			setPauseUpdateCb();
		}
	}, [objref, setPauseUpdateCb]);

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

	const getQPSChart = useCallback(() =>
	{
		const		obj = objref.current[qpsTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		let		baseval1, baselineArray;

		if (objref.current.svcinfo && objref.current.svcinfo.p95qps) {
			baseval1 = objref.current.svcinfo.p95qps;

			baselineArray = [
				{label : "Overall p95 QPS", value : baseval1, yaxis : 1 },
			];
		}

		const 		scatterArray = getScatterArray(qpsColumns[0].col, 1, svcRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={qpsRef} chartTitle={qpsTitle} columnInfoArr={qpsColumns} seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="Queries/sec (QPS)" y2AxisTitle="Server Errors"
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	


	const getRespChart = useCallback(() =>
	{
		const		obj = objref.current[respTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		let		baseval1, baseval2, baselineArray;

		if (objref.current.svcinfo && objref.current.svcinfo.p95resp5d) {
			baseval1 = objref.current.svcinfo.avgresp5d;
			baseval2 = objref.current.svcinfo.p95resp5d;

			baselineArray = [
				{label : "5 day Avg Response msec", value : baseval1, yaxis : 1 },
				{label : "5 day p95 Response msec", value : baseval2, yaxis : 2, position : "right" },
			];
		}

		const 		scatterArray = getScatterArray(respColumns[0].col, 1, svcRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={respRef} chartTitle={respTitle} columnInfoArr={respColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="Avg and p95 5 sec Response msec" y2AxisTitle="p955 min Response msec" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getConnChart = useCallback(() =>
	{
		const		obj = objref.current[connTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		let		baseval1, baselineArray;

		if (objref.current.svcinfo && objref.current.svcinfo.p95aconn) {
			baseval1 = objref.current.svcinfo.p95aconn;

			baselineArray = [
				{label : "Overall p95 Active Conns", value : baseval1, yaxis : 1 },
			];
		}

		const 		scatterArray = getScatterArray(connColumns[0].col, 1, svcRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={connRef} chartTitle={connTitle} columnInfoArr={connColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="Active TCP Connections per 15 sec" y2AxisTitle="Total TCP Connections per 15 sec" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
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

		const 		scatterArray = getScatterArray(netColumns[0].col, 1, svcRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={netRef} chartTitle={netTitle} columnInfoArr={netColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Network Inbound KB per 15 sec" y2AxisTitle="Network Outbound KB per 15 sec" 
					y1AxisFormat=",.3s" y2AxisFormat=",.3s" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getCPUIODelayChart = useCallback(() =>
	{
		const		obj = objref.current[cpuiodelayTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(cpuiodelayColumns[0].col, 1, svcRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={cpuiodelayRef} chartTitle={cpuiodelayTitle} columnInfoArr={cpuiodelayColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Listener Process CPU Delays in usec" y2AxisTitle="Listener Process IO Delays in usec" 
					y1AxisFormat=",.3s" y2AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getVMDelayRSSChart = useCallback(() =>
	{
		const		obj = objref.current[vmdelayRssTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(vmdelayRssColumns[0].col, 1, svcRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={vmdelayRssRef} chartTitle={vmdelayRssTitle} columnInfoArr={vmdelayRssColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Listener Process Memory Delays in usec" y2AxisTitle="Resident Memory in MB" 
					y1AxisFormat=",.3s" y2AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getCPUChart = useCallback(() =>
	{
		const		obj = objref.current[cpuTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(cpuColumns[0].col, 1, svcRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={cpuRef} chartTitle={cpuTitle} columnInfoArr={cpuColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Listener Process User CPU %" y2AxisTitle="Listener Process System CPU %" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
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
			{<SvcHostSummary parid={parid} objref={objref} isRealTime={isRealTime} aggregatesec={isaggregated ? aggregatesec : undefined} aggroper={aggroper} 
					timeSliderIndex={timeSliderIndex !== null ? timeSliderIndex : undefined} modalCount={modalCount} iscontainer={iscontainer}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} />}
			{!iscontainer && (<h4 style={{ textAlign : 'center', marginTop : 20 }} ><em><strong>Time Range Summary Slider</strong></em></h4>)}
			<div style={{ marginLeft : 70, marginRight : 100 }} >
			{!iscontainer && (<Slider marks={getTimeSliderMarks()} min={0} max={objref.current.maxSlider} 
					onChange={onTimeSliderChange} onAfterChange={onTimeSliderAfterChange} tooltipVisible={false} />)}
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

		const			tabKey = `SvcMonitor_${Date.now()}`;
		
		CreateTab('Service History', 
			() => { return <SvcMonitor isRealTime={false} starttime={tstarttime} endtime={tendtime} svcid={svcid} parid={parid} 
						aggregatesec={useAggr ? aggrMin * 60 : undefined} aggregatetype={aggrType}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [svcid, parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);	

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
			fstr = `( { svcid = '${svcid}' } and ${newfilter} )`;
		}
		else {
			fstr = `({ svcid = '${svcid}' })`;
		}	


		// Now close the search modal
		Modal.destroyAll();

		svcTableTab({parid, hostname : objref.current.summary.hostname, starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, 
				filter : fstr, maxrecs, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [parid, svcid, addTabCB, remTabCB, isActiveTabCB, objref]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range' showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <SvcStateMultiQuickFilter filterCB={onfiltercb} useHostFields={!parid} />;
	}, [parid]);	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			<ButtonModal buttontext={`Search Service '${objref.current.svcname}' State`} okText="Cancel" width={800}
				contentCB={() => (
					<SearchTimeFilter callback={onStateSearch} title='Search Service State' 
						timecompcb={timecb} filtercompcb={filtercb} ismaxrecs={true} defaultmaxrecs={50000} />
				)} />
					

			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			{isRealTime && realtimePaused === false && (<Button icon={<PauseCircleOutlined />} onClick={() => {objref.current.pauserealtime = true}}>Pause Auto Refresh</Button>)}
			{isRealTime && realtimePaused && (<Button icon={<PlayCircleOutlined />} onClick={() => {objref.current.resumerealtime = true}}>Resume Auto Refresh</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Service State'
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

		if (safetypeof(data) === 'array' && data.length > 0 && (safetypeof(data[0].svcstate) === 'array') && data[0].svcstate.length > 0) { 

			if (safetypeof(data[0].hostinfo) === 'object') {
				objref.current.summary.hostname 	= data[0].hostinfo.host;
				objref.current.summary.clustername	= data[0].hostinfo.cluster;
			}

			objref.current.svcname	= data[0].svcstate[0].name;

			let			newdata = data[0].svcstate, lastsec = moment(newdata[newdata.length - 1].time, moment.ISO_8601).unix();	

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

				const		qps1valid = getChartSeries(objref.current[qpsTitle].chartobj_[0], newdata, isRealTime, true);
				const		errvalid = qps1valid === true && getChartSeries(objref.current[qpsTitle].chartobj_[1], newdata, isRealTime, false);
				const		qpsvalid = qps1valid === true ? errvalid : qps1valid;
				const		qpschart = qpsvalid === true ? getQPSChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing QPS chart : ${qpsvalid}`} />);
		

				const		avgrespvalid = getChartSeries(objref.current[respTitle].chartobj_[0], newdata, isRealTime, true);
				const		p95respvalid = avgrespvalid === true && getChartSeries(objref.current[respTitle].chartobj_[1], newdata, isRealTime, false);
				const		respvalid = avgrespvalid === true ? p95respvalid : avgrespvalid;
				const		respchart = respvalid === true ? getRespChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Respone Time chart : ${respvalid}`} />);
		
				const		aconnvalid = getChartSeries(objref.current[connTitle].chartobj_[0], newdata, isRealTime, true);
				const		tconnvalid = aconnvalid === true && getChartSeries(objref.current[connTitle].chartobj_[1], newdata, isRealTime, false);
				const		connvalid = aconnvalid === true ? tconnvalid : aconnvalid;
				const		connchart = connvalid === true ? getConnChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Connections chart : ${connvalid}`} />);
		
				const		netinvalid = getChartSeries(objref.current[netTitle].chartobj_[0], newdata, isRealTime, true);
				const		netoutvalid = netinvalid === true && getChartSeries(objref.current[netTitle].chartobj_[1], newdata, isRealTime, false);
				const		netvalid = netinvalid === true ? netoutvalid : netinvalid;
				const		netchart = netvalid === true ? getNetChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Network Traffic chart : ${netvalid}`} />);
		
				const		cpudelayvalid = getChartSeries(objref.current[cpuiodelayTitle].chartobj_[0], newdata, isRealTime, true);
				const		iodelayvalid = cpudelayvalid === true && getChartSeries(objref.current[cpuiodelayTitle].chartobj_[1], newdata, isRealTime, false);
				const		cpuiodelayvalid = cpudelayvalid === true ? iodelayvalid : cpudelayvalid;
				const		cpuiodelaychart = cpuiodelayvalid === true ? getCPUIODelayChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Process CPU Delay/IO Delay chart : ${cpuiodelayvalid}`} />);
		
				const		vmdelayvalid = getChartSeries(objref.current[vmdelayRssTitle].chartobj_[0], newdata, isRealTime, true);
				const		rssvalid = vmdelayvalid === true && getChartSeries(objref.current[vmdelayRssTitle].chartobj_[1], newdata, isRealTime, false);
				const		vmdelayrssvalid = vmdelayvalid === true ? rssvalid : vmdelayvalid;
				const		vmdelayrsschart = vmdelayrssvalid === true ? getVMDelayRSSChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Process Memory Delay/RSS chart : ${vmdelayrssvalid}`} />);
		
				const		ucpuvalid = getChartSeries(objref.current[cpuTitle].chartobj_[0], newdata, isRealTime, true);
				const		scpuvalid = ucpuvalid === true && getChartSeries(objref.current[cpuTitle].chartobj_[1], newdata, isRealTime, false);
				const		cpuvalid = ucpuvalid === true ? scpuvalid : ucpuvalid;
				const		cpuchart = cpuvalid === true ? getCPUChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing CPU Utilization chart : ${cpuvalid}`} />);
		

				let		darr;

				if (isRealTime) {
					darr = objref.current.realtimearray;
				}
				else {
					darr = newdata;
				}	

				objref.current.maxSlider	= darr.length;
				objref.current.prevsummary 	= getSummary();

				objref.current.prevcharts = (
					<>
					{qpschart}
					{respchart}
					{connchart}
					{netchart}
					{cpuiodelaychart}
					{vmdelayrsschart}
					{cpuchart}
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

				console.log(`Service ${objref.current.svcname} State Data seen for time ${newdata[0].time}`);
			}

			/*console.log(`Svc State Data seen : data.length = ${data[0].svcstate.length} ${JSON.stringify(data[0].svcstate).slice(0, 256)}`);*/
		}
		else {
			let		ignerr = false;

			if (objref.current.prevdatasec && moment().unix() - objref.current.prevdatasec < 60) {
				ignerr = true;
			}

			bodycont = getPrevCharts(<Alert style={{ visibility: ignerr ? "hidden" : undefined }} type="warning" showIcon 
								message="Invalid or no data seen. Will retry after a few seconds..." />);

			console.log(`Service State Data Invalid / No data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
			
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
			
			console.log(`Service State Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);

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

		{!iscontainer && <Title level={4}><em>{isaggregated ? "Aggregated" : ""} Service State Monitor</em></Title>}
		{!iscontainer && hdrtagall}

		<div style={{ marginTop: 10, padding: 10 }}>

			<ErrorBoundary>
			{bodycont}
			</ErrorBoundary>

		</div>

		</div>
		</>

	);
}	




