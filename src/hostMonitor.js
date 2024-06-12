
import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import moment from 'moment';
import axios from 'axios';

import {Button, Space, Slider, Descriptions, Statistic, Typography, Empty, PageHeader, Tag, Alert, Modal, notification, message} from 'antd';
import {PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';

import { format } from "d3-format";

import './hostViewPage.css';

import {NodeApis} from './components/common.js';
import {HostInfoDesc, HostStateMultiQuickFilter, hostTableTab, HostModalCard, HostRangeAggrTimeCard, hostRangeTimeColumns, hostTimeColumns} from './hostViewPage.js';
import {ColumnInfo, fixedSeriesAddItems, getTimeEvent, getTimeSeries, getScatterObj, GyLineChart} from './components/gyChart.js';
import {safetypeof, getStateColor, validateApi, CreateRectSvg, fixedArrayAddItems, ButtonModal, CreateTab, arrayFilter,
	useFetchApi, LoadingAlert} from './components/util.js';
import {TimeRangeAggrModal} from './components/dateTimeZone.js';
import {SearchTimeFilter, SearchWrapConfig} from './multiFilters.js';
import {svcTableTab} from './svcDashboard.js';
import {procTableTab} from './procDashboard.js';
import {cpumemTableTab} from './cpuMemPage.js';
import {GyTable, getTableScroll} from './components/gyTable.js';

const { ErrorBoundary } = Alert;
const { Title } = Typography;

const fixedArraySize 	= 200;
const realtimesec	= 5;

const svcTitle 		= "Service Issues vs Total Services";
const procTitle 	= "Process Issues vs Total Processes";
const cpuDelayTitle 	= "Host Process CPU Delays";
const vmDelayTitle 	= "Host Process Memory Delays";
const ioDelayTitle 	= "Host Process IO Delays";


const cpuIssueCol 	= new ColumnInfo("cpuissue", "CPU Issue", getStateColor("Bad"), 1, "", true /* isextra */, true /* enableLegend */, true /* isnumber */,
					(event, val) => { return { fill : getStateColor(val > 0 ? 'Bad' : 'Good') } }); 
const memIssueCol 	= new ColumnInfo("memissue", "Memory Issue", getStateColor("Bad"), 1, "", true /* isextra */, true /* enableLegend */, true /* isnumber */, 
					(event, val) => { return { fill : getStateColor(val > 0 ? 'Bad' : 'Good') } }); 

const svcColumns = [
	new ColumnInfo("nlistissue", "# Services with Issues", "pink", 1, ",.0f"), 
	new ColumnInfo("nlistsevere", "# Severe Services", "orange", 1, ",.0f"), 
	cpuIssueCol, memIssueCol,
	new ColumnInfo("nlisten", "# Total Services", "cyan", 2, ",.0f"), 
];

const procColumns = [
	new ColumnInfo("nprocissue", "# Processes with Issues", "pink", 1, ",.0f"), 
	new ColumnInfo("nprocsevere", "# Severe Processes", "orange", 1, ",.0f"), 
	cpuIssueCol, memIssueCol,
	new ColumnInfo("nproc", "# Total Processes", "cyan", 2, ",.0f"), 
];

const cpuDelayColumns = [
	new ColumnInfo("cpudelms", "Host CPU Delays (msec)", "Tomato", 1, ","), 
	cpuIssueCol, 
];

const vmDelayColumns = [
	new ColumnInfo("vmdelms", "Host Memory Delays (msec)", "DarkSeaGreen", 1, ","), 
	memIssueCol, 
];

const ioDelayColumns = [
	new ColumnInfo("iodelms", "Host IO Delays (msec)", "steelblue", 1, ","), 
	memIssueCol, 
];



function hostStateColorStyle(column, event, statecolumn, opacity = 1.0)
{
	const state = event.get(statecolumn);
	const color = getStateColor(state > 0 ? 'Bad' : 'Good');

	return {
		normal: {
			fill: color,
			opacity: opacity,
		},
		highlighted: {
			fill: color,
			stroke: "none",
			opacity: opacity,
		},
		selected: {
			fill: "none",
			stroke: "#2CB1CF",
			strokeWidth: 3,
			opacity: opacity,
		},
		muted: {
			stroke: "none",
			opacity: opacity/2,
			fill: color
		}
	};
};

function hostStateScatterRadius(event, column, statecolumn, onlyBad = false)
{
	const state = event.get(statecolumn);

	if (onlyBad) {
		// Show only Bad/Severe

		if (state > 0) return 3;
		return 0;
	}	

	return 3;
}

const cpuScatterStyle = (column, event) => { return hostStateColorStyle(column, event, "cpuissue") };
const memScatterStyle = (column, event) => { return hostStateColorStyle(column, event, "memissue", 0.5) };

const cpuRadiusCb = (column, event) => { return hostStateScatterRadius(column, event, "cpuissue", true) };
const memRadiusCb = (column, event) => { return hostStateScatterRadius(column, event, "memissue", true) };

function getScatterArray(piggybackCol, yaxis, cRadiusCb, mRadiusCb)
{ 
	return [
		getScatterObj("cpuissue", yaxis, cpuScatterStyle, cRadiusCb, ".0f", "rect", piggybackCol),
		getScatterObj("memissue", yaxis, memScatterStyle, mRadiusCb, ".0f", "circle", piggybackCol),
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

	summary.statebad		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.svcbad			= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.procbad			= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.cpubad			= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.membad			= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	


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
					if (summary.statebad.nrecs === 0) {
						summary.statebad.firstidx = i;
					}	

					summary.statebad.nrecs++;
					summary.statebad.lastidx = i;

					statemarker = true;
				}	
			}
			else {
				summary.nrecs += item.inrecs;

				if (item.issue > 0) {
					if (summary.statebad.nrecs === 0) {
						summary.statebad.firstidx = i;
					}	

					summary.statebad.nrecs += item.issue;
					summary.statebad.lastidx = i;

					statemarker = true;
				}
			}	

			if (statemarker === true) {
				summary.statemarker.push(i);

				if (item.nlistissue > 0) {
					const		sobj = summary.svcbad;

					if (sobj.nrecs === 0) {
						sobj.firstidx = i;
					}	

					sobj.nrecs++;
					sobj.lastidx = i;
				}	

				if (item.nprocissue > 0) {
					const		sobj = summary.procbad;

					if (sobj.nrecs === 0) {
						sobj.firstidx = i;
					}	

					sobj.nrecs++;
					sobj.lastidx = i;
				}	

				if (Number(item.cpuissue) > 0) {
					const		sobj = summary.cpubad;

					if (sobj.nrecs === 0) {
						sobj.firstidx = i;
					}	

					sobj.nrecs++;
					sobj.lastidx = i;
				}

				if (Number(item.memissue) > 0) {
					const		sobj = summary.membad;

					if (sobj.nrecs === 0) {
						sobj.firstidx = i;
					}	

					sobj.nrecs++;
					sobj.lastidx = i;
				}
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


function HostMonitorSummary({objref, isRealTime, aggregatesec, aggroper, timeSliderIndex, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const 			summary = objref.current.summary;	
	const			isaggregated = (aggregatesec !== undefined);
	const			avgstr = (isaggregated ? "Avg " : "");

	const title = (<div style={{ textAlign : 'center' }}><Title level={4}>Summary for Host <em>{summary.hostname}</em> of Cluster <em>{summary.clustername}</em></Title></div>);

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


	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Host '{summary.hostname}' Info</strong></span>,
			content : <HostInfoDesc parid={summary.parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	


	const getSvcStateTable = (linktext, filter, tstart, tend) => {
		return <Button type='dashed' onClick={() => {
			svcTableTab({parid : summary.parid, starttime : tstart, endtime : tend, filter, name : `Host ${summary.hostname}`, maxrecs : 10000,
					addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter, tstart, tend) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({parid : summary.parid, starttime : tstart, endtime : tend, filter, name : `Host ${summary.hostname}`, maxrecs : 10000,
					addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const tableOnRow = (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Host {record.host}</strong></span>,
					content : (
						<>
						{!isaggregated && <HostModalCard rec={record} parid={record.parid ?? summary.parid} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}

						{isaggregated && <HostRangeAggrTimeCard rec={record} parid={summary.parid} 
							aggrMin={aggregatesec >= 60 ? aggregatesec/60 : 1} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}
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
					<GyTable columns={isaggregated ? hostRangeTimeColumns(aggroper, false) : hostTimeColumns(false)} onRow={tableOnRow} 
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


	let			ltime;

	if (lastitem && lastitem.time) {
		ltime = `Last Seen Statistics at time ${lastitem.time}`;
	}	
	else {
		ltime = 'Last Seen Statistics';
	}	

	const lasttitle = (<div style={{ textAlign : 'center', marginTop: 20 }}><span style={{ fontSize: 16 }}> 
				<em><strong>{aggregatesec ? `${aggregatesec/60} min ${aggroper} Aggregated` : ""} {ltime}</strong></em></span></div>);

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
				label={<em># {isaggregated ? "Individual " : ""} Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nrecs} />
			</Descriptions.Item>

			<Descriptions.Item label={<em>Host Info</em>}> <Button type='dashed' onClick={getHostInfo} >Get Host Information</Button> </Descriptions.Item>

			{isaggregated &&
			<Descriptions.Item 
				label={<em># Aggregated Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.naggrrecs} />
			</Descriptions.Item>
			}

			<Descriptions.Item 
				label={<em># Bad States</em>}>
				<Space>

				<>
				{summary.statebad.nrecs > 0 ? createLinkModal((
					<>
					{CreateRectSvg('red')}
					<span style={{ fontSize: 14 }}><em>&nbsp; {summary.statebad.nrecs} </em></span>
					{!isTabletOrMobile && <span style={{ fontSize: 12 }}><em>&nbsp; / {summary.nrecs}</em></span>}
					</>
					), 'Host State Issue', 
					(item) => (item.state === 'Bad' || item.state === 'Severe' || item.issue > 0), summary.statebad.firstidx, summary.statebad.lastidx + 1, summary.statebad.nrecs,
					) : `0 / ${summary.nrecs}`}

				</>
				
				</Space>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Times Service Issues</em>}>
				<>
				{summary.svcbad.nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.svcbad.nrecs} />
					), 'Service State Issue', 
					(item) => (item.nlistissue > 0), summary.svcbad.firstidx, summary.svcbad.lastidx + 1, summary.svcbad.nrecs,
					() => getSvcStateTable('Get All Services with Issues', `{ state in 'Bad','Severe' }`,
					summary.dataarr[summary.svcbad.firstidx]?.time, summary.dataarr[summary.svcbad.lastidx]?.time))					
					: 0}

				</>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Times Process Issues</em>}>
				<>
				{summary.procbad.nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.procbad.nrecs} />
					), 'Process State Issue', 
					(item) => (item.nprocissue > 0), summary.procbad.firstidx, summary.procbad.lastidx + 1, summary.procbad.nrecs,
					() => getProcStateTable('Get All Processes with Issues', `{ state in 'Bad','Severe' }`,
					summary.dataarr[summary.procbad.firstidx]?.time, summary.dataarr[summary.procbad.lastidx]?.time))					
					: 0}				
				</>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Times CPU Issues</em>}>
				<>
				{summary.cpubad.nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpubad.nrecs} />
					), 'CPU Issue', 
					(item) => (Number(item.cpuissue) > 0), summary.cpubad.firstidx, summary.cpubad.lastidx + 1, summary.cpubad.nrecs,
					) : 0}		
				</>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Times Memory Issues</em>}>
				<>
				{summary.membad.nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.membad.nrecs} />
					), 'Memory Issue', 
					(item) => (Number(item.memissue) > 0), summary.membad.firstidx, summary.membad.lastidx + 1, summary.membad.nrecs,
					) : 0}				
				</>
			</Descriptions.Item>

		</Descriptions>

		{ lastitem && (isRealTime || ismid) && (

			<Descriptions title={lasttitle} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >

			<Descriptions.Item 
				label={<em>{!ismid && `Last`} {avgstr} Host State</em>}>
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
				label={<em>{avgstr}Services with Issues</em>}>
				{lastitem.nlistissue > 0 ? 
					getSvcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nlistissue)} />, 
					`{ svcstate.state in 'Bad','Severe' }`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}				
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Services with Severe Issues</em>}>
				{lastitem.nlistsevere > 0 ? 
					getSvcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nlistsevere)} />, 
					`{ svcstate.state = 'Severe' }`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}				
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Total Services</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.nlisten)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Processes with Issues</em>}>
				{lastitem.nprocissue > 0 ? 
					getProcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nprocissue)} />, 
					`{ procstate.state in 'Bad','Severe' }`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}							
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Processes with Severe Issues</em>}>
				{lastitem.nprocsevere > 0 ? 
					getProcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nprocsevere)} />, 
					`{ procstate.state = 'Severe' }`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}				
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Total Processes</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",.0f")(lastitem.nproc)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Host CPU Delays msec</em>}>
				{lastitem.cpudelms > 0 ? 
					getProcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.cpudelms)} />, 
					`{ procstate.cpudel > 0 }`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}							
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Host Memory Delays msec</em>}>
				{lastitem.vmdelms > 0 ? 
					getProcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.vmdelms)} />, 
					`{ procstate.vmdel > 0 }`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}							
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr}Host IO Delays msec</em>}>
				{lastitem.iodelms > 0 ? 
					getProcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.iodelms)} />, 
					`{ procstate.iodel > 0 }`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}							
			</Descriptions.Item>


			{lastitem.cpuissue &&
				<Descriptions.Item 
					label={<em>{avgstr}CPU State</em>}>
					{CreateRectSvg(getStateColor(lastitem.severecpu ? 'Severe' : 'Bad'))}
					<span> {lastitem.severecpu ? 'Severe' : 'Bad'} </span>
				</Descriptions.Item>
			}

			{lastitem.memissue && !isaggregated &&
				<Descriptions.Item 
					label={<em>{avgstr}Memory State</em>}>
					{CreateRectSvg(getStateColor(lastitem.severemem ? 'Severe' : 'Bad'))}
					<span> {lastitem.severemem ? 'Severe' : 'Bad'} </span>
				</Descriptions.Item>
			}

			</Descriptions>
			)
		}	

		</>

	);		
}

export function HostMonitor({parid, isRealTime, starttime, endtime, aggregatesec, aggregatetype, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile})
{
	const 		objref = useRef(null);
	const		svcRef = useRef(null), procRef = useRef(null), cpuDelayRef = useRef(null), vmDelayRef = useRef(null), ioDelayRef = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[realtimePaused, setrealtimePaused] = useState(false);
	const		[isaggregated, ] = useState(aggregatesec ? aggregatesec >= 2 * realtimesec : false);
	const		[aggroper, ] = useState(aggregatetype ?? "avg");
	const		[fetchIntervalmsec, ] = useState((isaggregated ? aggregatesec * 1000 : realtimesec * 1000));
	const		[timeSliderIndex, setTimeSlider] = useState(null);

	if (objref.current === null) {
		console.log(`HostMonitor initializing for first time : isRealTime=${isRealTime} starttime=${starttime} endtime=${endtime} aggregatesec=${aggregatesec} aggregatetype=${aggregatetype}`);

		objref.current = {
			isstarted 		: false,
			niter			: 0,
			isdrilldown		: false,
			updtracker		: null,
			nextfetchtime		: Date.now(),
			lastpausetime		: '',
			pauserealtime		: false,
			resumerealtime		: false,
			prevdata		: null,
			prevdatastart		: null,
			prevsummary		: null,
			prevcharts		: null,
			timeSliderIndex		: null,
			sliderTimer		: null,
			maxSlider		: 0,
		};	

		objref.current[svcTitle] 	= new ChartInfo(svcTitle, svcColumns); 	
		objref.current[procTitle] 	= new ChartInfo(procTitle, procColumns); 	
		objref.current[cpuDelayTitle] 	= new ChartInfo(cpuDelayTitle, cpuDelayColumns); 	
		objref.current[vmDelayTitle] 	= new ChartInfo(vmDelayTitle, vmDelayColumns); 	
		objref.current[ioDelayTitle] 	= new ChartInfo(ioDelayTitle, ioDelayColumns); 	

		objref.current.realtimearray	=	[];

		objref.current.summary 		= {
			hostname		: '',
			clustername		: '',
			parid			: parid,
			dataarr			: null,
		};	

		initSummary(objref.current.summary);
	}

	useEffect(() => {
		return () => {
			console.log(`HostMonitor destructor called...`);
		};	
	}, []);

	const validProps = useMemo(() => {	

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
	}, [parid, isRealTime, starttime, endtime]);	

	if (validProps === false) {
		// This should not occur
		throw new Error(`Internal Error : HostMonitor validProps check failed`);
	}	

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
						if (svcRef && svcRef.current) {
							svcRef.current.setResetZoom();
						}	

						objref.current.resumerealtime 	= false;
						objref.current.pauserealtime	= false;
					}	
					else if (objref.current.isdrilldown || (false === isact) || (objref.current.timeSliderIndex !== null) ||
						(objref.current.pauserealtime === true)) {

						if (objref.current.lastpausetime === '') {
							objref.current.lastpausetime = moment().format();
							setrealtimePaused(true);
						}	

						return;
					}	
				}

				conf = { 
					url 		: NodeApis.hoststate, 
					method 		: 'post', 
					data 		: { 
						parid 		: parid,
						timeoutsec 	: isRealTime && !isaggregated ? 10 : 100,
						options		: {
							aggregate	: isaggregated, 
							aggrsec		: isaggregated ? aggregatesec : undefined,
							aggroper	: aggroper,
							sortcolumns	: isaggregated ? [ "time" ] : undefined,
						},	
						timeoffsetsec	: isRealTime && isaggregated ? aggregatesec : undefined,
					}, 
					timeout 	: isRealTime && !isaggregated ? 10000 : 100000,
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
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Host Monitor Data fetch..."});
				}	

				if (isstart) {
					objref.current.isstarted = true;
				}	

			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new Host Monitor data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				objref.current.nextfetchtime = Date.now() + 30000;
			}	
			finally {
				timer1 = setTimeout(apiCall, 1000);
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for HostMonitor setinterval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, parid, isRealTime, starttime, endtime, fetchIntervalmsec, aggroper, aggregatesec, isaggregated, tabKey, isActiveTabCB, svcRef]);	
	
	const svcRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!svcRef.current) return;

					const			tref = svcRef;

					svcTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ state in 'Bad','Severe' }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Services with Issues</Button>
			
			<Button onClick={() => {
					if (!svcRef.current) return;

					const			tref = svcRef;

					cpumemTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
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
	}, [svcRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const procRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!procRef.current) return;

					const			tref = procRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ state in 'Bad','Severe' }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Processes with Issues</Button>
			
			<Button onClick={() => {
					if (!procRef.current) return;

					const			tref = procRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get All Processes State</Button>

			</Space>
			</>
		);
	}, [procRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

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
					})}} >Get Processes with CPU Delays</Button>
			
			<Button onClick={() => {
					if (!procRef.current) return;

					const			tref = procRef;

					procTableTab({
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
					})}} >Get All Processes State</Button>

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
					})}} >Get Processes with Memory Delays</Button>
			
			<Button onClick={() => {
					if (!procRef.current) return;

					const			tref = procRef;

					procTableTab({
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
					})}} >Get All Processes State</Button>

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
					})}} >Get Processes with IO Delays</Button>
			
			<Button onClick={() => {
					if (!procRef.current) return;

					const			tref = procRef;

					procTableTab({
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
					})}} >Get All Processes State</Button>

			</Space>
			</>
		);
	}, [ioDelayRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	



	const onRescaleComps = useCallback((title, isrescale) => {

		console.log(`title = ${title} onRescaleComps : isrescale = ${isrescale}`);

		objref.current.isdrilldown = isrescale;

		if (isrescale === false) {
			return null;
		}	

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		switch (title) {

			case svcTitle 		: return svcRescaleComps;

			case procTitle 		: return procRescaleComps;

			case cpuDelayTitle 	: return cpuDelayRescaleComps;

			case vmDelayTitle 	: return vmDelayRescaleComps;

			case ioDelayTitle 	: return ioDelayRescaleComps;

			default			: return null;
		}
	}, [objref, svcRescaleComps, procRescaleComps, cpuDelayRescaleComps, vmDelayRescaleComps, ioDelayRescaleComps]);

	const getRefFromTitle = useCallback((title) => {
		switch (title) {
			
			case svcTitle 		:	return svcRef;

			case procTitle		:	return procRef;

			case cpuDelayTitle	:	return cpuDelayRef;

			case vmDelayTitle	:	return vmDelayRef;

			case ioDelayTitle	:	return ioDelayRef;

			default			:	return null;
		};	

	}, [svcRef, procRef, cpuDelayRef, vmDelayRef, ioDelayRef]);	

	const timeRangeCB = useCallback((title, newtimerange) => {

		console.log(`title = ${title} New Timerange CB : newtimerange = ${newtimerange}`);

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		[svcTitle, procTitle, cpuDelayTitle, vmDelayTitle, ioDelayTitle].forEach((item) => {
			if (item !== title) {
				const		ref = getRefFromTitle(item);

				if (ref && ref.current) {
					ref.current.setNewTimeRange(newtimerange);
				}
			}	
		});	

	}, [getRefFromTitle]);

	const timeTrackerCB = useCallback((newdate) => {

		[svcTitle, procTitle, cpuDelayTitle, vmDelayTitle, ioDelayTitle].forEach((item) => {
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

	const getSvcChart = useCallback(() =>
	{
		const		obj = objref.current[svcTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(svcColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={svcRef} chartTitle={svcTitle} columnInfoArr={svcColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Services with Issues" y2AxisTitle="Total Services" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	


	const getProcChart = useCallback(() =>
	{
		const		obj = objref.current[procTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(procColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={procRef} chartTitle={procTitle} columnInfoArr={procColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Processes with Issues" y2AxisTitle="Total Processes" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	


	const getCPUDelayChart = useCallback(() =>
	{
		const		obj = objref.current[cpuDelayTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0];

		if (!cobj1.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(cpuDelayColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={cpuDelayRef} chartTitle={cpuDelayTitle} columnInfoArr={cpuDelayColumns} 
					seriesy1={cobj1.timeseries_} 
					enableTracker={true} chartHeight={350} y1AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Host CPU Delays msec" 
					y1AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getVMDelayChart = useCallback(() =>
	{
		const		obj = objref.current[vmDelayTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0];

		if (!cobj1.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(vmDelayColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={vmDelayRef} chartTitle={vmDelayTitle} columnInfoArr={vmDelayColumns} 
					seriesy1={cobj1.timeseries_} 
					enableTracker={true} chartHeight={350} y1AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Host Memory Delays msec" 
					y1AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getIODelayChart = useCallback(() =>
	{
		const		obj = objref.current[ioDelayTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0];

		if (!cobj1.timeseries_) {
			return null;
		}	

		const 		scatterArray = getScatterArray(ioDelayColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={ioDelayRef} chartTitle={ioDelayTitle} columnInfoArr={ioDelayColumns} 
					seriesy1={cobj1.timeseries_} 
					enableTracker={true} chartHeight={350} y1AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Host IO Delays msec" 
					y1AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
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
		return (
			<>
			{<HostMonitorSummary objref={objref} isRealTime={isRealTime} aggregatesec={isaggregated ? aggregatesec : undefined} aggroper={aggroper} 
					timeSliderIndex={timeSliderIndex !== null ? timeSliderIndex : undefined} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} />}
			{<h3 style={{ textAlign : 'center', marginTop : 20 }} ><em><strong>Time Range Summary Slider</strong></em></h3>}
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

		const			tabKey = `HostMonitor_${Date.now()}`;
		
		CreateTab('Hoststate History', 
			() => { return <HostMonitor isRealTime={false} starttime={tstarttime} endtime={tendtime} parid={parid} 
						aggregatesec={useAggr ? aggrMin * 60 : undefined} aggregatetype={aggrType}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);	


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

		let			fstr = newfilter;

		// Now close the search modal
		Modal.destroyAll();

		hostTableTab({parid, hostname : objref.current.summary.hostname, starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, 
				filter : fstr, maxrecs, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [parid, addTabCB, remTabCB, isActiveTabCB, objref]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range'
				initStart={true} showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <HostStateMultiQuickFilter filterCB={onfiltercb} useHostFields={!parid} />;
	}, [parid]);	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			<ButtonModal buttontext={`Search Host '${objref.current.summary.hostname}' State`} width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onStateSearch} title='Search Host State' 
						timecompcb={timecb} filtercompcb={filtercb} ismaxrecs={true} defaultmaxrecs={50000} />
				)} />
					

			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			{isRealTime && realtimePaused === false && (<Button icon={<PauseCircleOutlined />} onClick={() => {objref.current.pauserealtime = true}}>Pause Auto Refresh</Button>)}
			{isRealTime && realtimePaused && (<Button icon={<PlayCircleOutlined />} onClick={() => {objref.current.resumerealtime = true}}>Resume Auto Refresh</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Host State'
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

		if (safetypeof(data) === 'array' && data.length > 0 && (safetypeof(data[0].hoststate) === 'array') && data[0].hoststate.length > 0) { 

			if (safetypeof(data[0].hostinfo) === 'object') {
				objref.current.summary.hostname 	= data[0].hostinfo.host;
				objref.current.summary.clustername	= data[0].hostinfo.cluster;
			}

			if (isRealTime) {
				hdrtag = <Tag color='green'>Running with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>;
			}
			else {
				hdrtag = <Tag color='blue'>Auto Refresh Disabled</Tag>;
			}	

			let		newdata = data[0].hoststate;	

			if ((moment(newdata[0].time, moment.ISO_8601).unix() >= moment(objref.current.summary.starttime, moment.ISO_8601).unix()) && 
				(moment(newdata[newdata.length - 1].time, moment.ISO_8601).unix() <= moment(objref.current.summary.endtime, moment.ISO_8601).unix())) {

				console.log(`Duplicate record seen...`);

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

				const		listissuevalid = getChartSeries(objref.current[svcTitle].chartobj_[0], newdata, isRealTime, true);
				const		totalvalid = listissuevalid === true && getChartSeries(objref.current[svcTitle].chartobj_[1], newdata, isRealTime, false);
				const		svcvalid = listissuevalid === true ? totalvalid : listissuevalid;
				const		svcchart = svcvalid === true ? getSvcChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Service Issue chart : ${svcvalid}`} />);
		

				const		procissuevalid = getChartSeries(objref.current[procTitle].chartobj_[0], newdata, isRealTime, true);
				const		totalprocvalid = procissuevalid === true && getChartSeries(objref.current[procTitle].chartobj_[1], newdata, isRealTime, false);
				const		procvalid = procissuevalid === true ? totalprocvalid : procissuevalid;
				const		procchart = procvalid === true ? getProcChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Process Issue chart : ${procvalid}`} />);
		
				const		cpudelayvalid = getChartSeries(objref.current[cpuDelayTitle].chartobj_[0], newdata, isRealTime);
				const		cpudelaychart = cpudelayvalid === true ? getCPUDelayChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing CPU Delay chart : ${cpudelayvalid}`} />);
		
				const		vmdelayvalid = getChartSeries(objref.current[vmDelayTitle].chartobj_[0], newdata, isRealTime);
				const		vmdelaychart = vmdelayvalid === true ? getVMDelayChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Memory Delay chart : ${vmdelayvalid}`} />);
		
				const		iodelayvalid = getChartSeries(objref.current[ioDelayTitle].chartobj_[0], newdata, isRealTime);
				const		iodelaychart = iodelayvalid === true ? getIODelayChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing IO Delay chart : ${iodelayvalid}`} />);
		
		
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
					{svcchart}
					{procchart}
					{cpudelaychart}
					{vmdelaychart}
					{iodelaychart}
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

				console.log(`Host ${objref.current.summary.hostname} State Data seen for time ${newdata[0].time}`);
			}

			/*console.log(`Host State Data seen : data.length = ${data[0].hoststate.length} ${JSON.stringify(data[0].hoststate).slice(0, 256)}`);*/
		}
		else {
			bodycont = getPrevCharts(<Alert type="error" showIcon message="Invalid or no data seen. Will retry after a few seconds..." description=<Empty /> />);

			console.log(`Host State Data Invalid / No data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
			
			objref.current.nextfetchtime = Date.now() + 30000;
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getPrevCharts(<Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Host State Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);

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

		{!tabKey ?  (<PageHeader className="site-page-header" backIcon={false} title=<em>Host State Monitor</em> tags={hdrtagall} /> )
		: 	(	
				<>
				<Title level={3}>{isaggregated ? "Aggregated" : ""} Host State Monitor</Title>
				{hdrtagall}
				</>
			)
		}

		<div style={{ marginTop: 10, padding: 10 }}>

			<ErrorBoundary>
			{bodycont}
			</ErrorBoundary>

		</div>

		</div>
		</>

	);
}

export function HostnameComponent({hostname, tabKey, remTabCB, Component = HostMonitor, ...props})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
	
		const conf = 
		{
			url 	: NodeApis.nodeparthainfo,
			method	: 'post',
			data : { host : hostname },	
		};	

		const xfrmresp = (apidata) => {

			if (!hostname || !apidata[hostname] || !apidata[hostname].parid) {
				throw new Error(`No Valid Partha ID found for hostname ${hostname}`);
			}
					
			return apidata[hostname].parid;
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Hostname Lookup failure", 
				description : `Exception occured while waiting for hostname data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for hostname fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [hostname, doFetch]);

	if (isloading === false && isapierror === false) { 
		if (!data) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			hinfo = <Component {...props} parid={data} tabKey={tabKey} remTabCB={remTabCB} />;
		}

	}
	else if (isapierror) {
		const emsg = `Error while fetching hostname data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		closetab = 60000;
	}	
	else {
		hinfo = <LoadingAlert />;
	}

	if (closetab > 1000 && tabKey && remTabCB) {
		remTabCB(tabKey, closetab);
	}	

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);
}


