
import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import moment from 'moment';
import axios from 'axios';

import {Button, Space, Slider, Modal, Descriptions, Statistic, Typography, Tag, Alert, notification, message} from 'antd';
import {PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';

import {format} from "d3-format";

import './hostViewPage.css';

import {NodeApis} from './components/common.js';
import {ColumnInfo, fixedSeriesAddItems, getTimeEvent, getTimeSeries, GyLineChart} from './components/gyChart.js';
import {GyTable} from './components/gyTable.js';
import {safetypeof, validateApi, CreateRectSvg, fixedArrayAddItems, CreateLinkTab, ComponentLife, ButtonModal, arrayFilter, CreateTab} from './components/util.js';
import {mergeClusterTimestamps, ClusterHostList, clusterTimeColumns, clusterAggrTimeColumns, ClusterModalCard, clusterTableTab, ClusterStateMultiQuickFilter} from './clusterDashboard.js';
import {TimeRangeAggrModal} from './components/dateTimeZone.js';
import {SearchTimeFilter, SearchWrapConfig} from './multiFilters.js';
import {svcTableTab} from './svcDashboard.js';
import {procTableTab} from './procDashboard.js';
import {hostTableTab} from './hostViewPage.js';

const {ErrorBoundary} = Alert;
const {Title} = Typography;

const fixedArraySize 	= 200;
const realtimesec 	= 5;

const svcTitle 		= "Service Issues vs Hosts with Service Issues";
const qpsTitle 		= "Cluster Queries/sec (QPS)";
const netTitle 		= "Services Network Traffic per 15 sec in MB";
const procTitle 	= "Process Issues vs Hosts with Process Issues";
const cpumemTitle 	= "Hosts with CPU Issues vs Hosts with Memory Issues";
const hostTitle 	= "# Cluster Hosts";


const svcColumns 	= [
	new ColumnInfo("nlistissue", "# Service Issues", "pink", 1, ","), 
	new ColumnInfo("nlisthosts", "Hosts with Service Issues", "orange", 2, ","), 
];

const qpsColumns	= [
	new ColumnInfo("totqps", "Cluster Queries/sec (QPS)", "steelblue", 1, ","), 
];

const netColumns	= [
	new ColumnInfo("svcnetmb", "Service Network MB per 15 sec", "DarkSeaGreen", 1, ","), 
];

const procColumns 	= [
	new ColumnInfo("nprocissue", "# Process Issues", "pink", 1, ","), 
	new ColumnInfo("nprochosts", "Hosts with Process Issues", "orange", 2, ","), 
];

const cpumemColumns 	= [
	new ColumnInfo("ncpuissue", "# CPU Issue Hosts", "orange", 1, ","), 
	new ColumnInfo("nmemissue", "# Memory Issue Hosts", "steelblue", 2, ","), 
];

const hostColumns	= [
	new ColumnInfo("nhosts", "# Cluster Hosts", "pink", 1, ","), 
];

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

	summary.svcissue		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.procissue		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.cpuissue		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.memissue		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.maxqps			= {
						maxval		: 0,
						idx		: 0,
					};	

	summary.maxnetmb		= {
						maxval		: 0,
						idx		: 0,
					};	

	summary.maxhosts		= {
						maxval		: 0,
						idx		: 0,
					};

	summary.minhosts		= {
						minval		: 10000000,
						idx		: 0,
					};	


	summary.statemarker		= [];

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
			
			if (isaggregated) {
				summary.nrecs += item.inrecs;
			}


			if (item.nlistissue > 0) {
				if (summary.svcissue.nrecs === 0) {
					summary.svcissue.firstidx = i;
				}	

				summary.svcissue.nrecs++;
				summary.svcissue.lastidx = i;

				statemarker = true;
			}	

			if (item.nprocissue > 0) {
				if (summary.procissue.nrecs === 0) {
					summary.procissue.firstidx = i;
				}	

				summary.procissue.nrecs++;
				summary.procissue.lastidx = i;

				statemarker = true;
			}	

			if (item.ncpuissue > 0) {
				if (summary.cpuissue.nrecs === 0) {
					summary.cpuissue.firstidx = i;
				}	

				summary.cpuissue.nrecs++;
				summary.cpuissue.lastidx = i;

				statemarker = true;
			}	
			if (item.nmemissue > 0) {
				if (summary.memissue.nrecs === 0) {
					summary.memissue.firstidx = i;
				}	

				summary.memissue.nrecs++;
				summary.memissue.lastidx = i;

				statemarker = true;
			}	

			if (item.totqps > summary.maxqps.maxval) {
				summary.maxqps.maxval = item.totqps;
				summary.maxqps.idx = i;
			}	

			if (item.svcnetmb > summary.maxnetmb.maxval) {
				summary.maxnetmb.maxval = item.svcnetmb;
				summary.maxnetmb.idx = i;
			}	

			if (item.nhosts > summary.maxhosts.maxval) {
				summary.maxhosts.maxval = item.nhosts;
				summary.maxhosts.idx = i;
			}	

			if (item.nhosts < summary.minhosts.minval) {
				summary.minhosts.minval = item.nhosts;
				summary.minhosts.idx = i;
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


function ClusterSummary({cluster, objref, isRealTime, aggregatesec, aggroper, timeSliderIndex, modalCount, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const 			summary = objref.current.summary;	
	const			isaggregated = (aggregatesec !== undefined);
	const			avgstr = (isaggregated ? "Aggr " : "");

	const title = (<div style={{ textAlign : 'center' }}><Title level={4}>Summary for Cluster <em>{cluster}</em></Title></div>);

	let 			lastitem = null;
	
	if (summary.dataarr && safetypeof(summary.dataarr) === 'array' && summary.dataarr.length > 0) {
		if (timeSliderIndex >= 0 && (timeSliderIndex < summary.dataarr.length)) {
			lastitem = summary.dataarr[timeSliderIndex];
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

	const getClusterHostList = () => {

		const		tabKey = `ClusterHostList_${Date.now()}`;

		return CreateLinkTab(<span><i>Cluster Hosts List</i></span>, 'Cluster Hosts List',
					() => { return <ClusterHostList cluster={cluster}
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
								isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getHostStateTable = (linktext, filter, tstart, tend) => {
		return <Button type='dashed' onClick={() => {
			hostTableTab({starttime : tstart, endtime : tend, filter, name : `Cluster ${cluster}`, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const getSvcStateTable = (linktext, filter, tstart, tend) => {
		return <Button type='dashed' onClick={() => {
			svcTableTab({starttime : tstart, endtime : tend, filter, name : `Cluster ${cluster}`, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter, tstart, tend) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({starttime : tstart, endtime : tend, filter, name : `Cluster ${cluster}`, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const tableOnRow = (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Cluster {record.cluster}</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						<ClusterModalCard rec={record}  
							aggrType={aggroper} isTabletOrMobile={isTabletOrMobile} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
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
					<ComponentLife stateCB={modalCount} />
					{typeof extraelemcb === 'function' && ( <div style={{ marginBottom : 30 }}> {extraelemcb()} </div>)}
					<GyTable columns={isaggregated ? clusterAggrTimeColumns(aggroper) : clusterTimeColumns} modalCount={modalCount} onRow={tableOnRow} 
							dataSource={arrayFilter(filt, summary.dataarr, firstidx, lastidx, nrecs)} 
							rowKey={((record) => record.cluster + record.time)} />
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
				label={<em># {isaggregated ? "Individual " : ""} Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nrecs} />
			</Descriptions.Item>

			{isaggregated &&
			<Descriptions.Item 
				label={<em># Aggregated Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.naggrrecs} />
			</Descriptions.Item>
			}

			<Descriptions.Item label={<em>Cluster Hosts List</em>}> {getClusterHostList()} </Descriptions.Item>

			<Descriptions.Item 
				label={<em># Times Service Issues</em>}>
				{summary.svcissue.nrecs > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 16 }} value={summary.svcissue.nrecs} />, 'Service Issues', 
					(item) => item.nlistissue > 0, summary.svcissue.firstidx, summary.svcissue.lastidx + 1, summary.svcissue.nrecs,
					() => getSvcStateTable('Get All Services with Issues', `( ({ host.cluster = '${cluster}' }) and ({ state in 'Bad','Severe' }) )`,
					summary.dataarr[summary.svcissue.firstidx]?.time, summary.dataarr[summary.svcissue.lastidx]?.time)) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Times Process Issues</em>}>
				{summary.procissue.nrecs > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 16 }} value={summary.procissue.nrecs} />, 'Process Issues', 
					(item) => item.nprocissue > 0, summary.procissue.firstidx, summary.procissue.lastidx + 1, summary.procissue.nrecs,
					() => getProcStateTable('Get All Processes with Issues', `( ({ host.cluster = '${cluster}' }) and ({ state in 'Bad','Severe' }) )`,
					summary.dataarr[summary.procissue.firstidx]?.time, summary.dataarr[summary.procissue.lastidx]?.time)) : 0}
			</Descriptions.Item>


			<Descriptions.Item 
				label={<em># Times Host CPU Issues</em>}>
				{summary.cpuissue.nrecs > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuissue.nrecs} />, 'Host CPU Issues', 
					(item) => item.ncpuissue > 0, summary.cpuissue.firstidx, summary.cpuissue.lastidx + 1, summary.cpuissue.nrecs) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Times Memory Issues</em>}>
				{summary.memissue.nrecs > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissue.nrecs} />, 'Host Memory Issues', 
					(item) => item.nmemissue > 0, summary.memissue.firstidx, summary.memissue.lastidx + 1, summary.memissue.nrecs) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Max Cluster Queries/sec QPS</em>}>
				{summary.maxqps.maxval > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 16 }} value={summary.maxqps.maxval} />, 'Max Cluster Queries/sec', 
					(item) => item.totqps === summary.maxqps.maxval, summary.maxqps.idx, summary.maxqps.idx + 1, summary.maxqps.nrecs) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Max Service Network Traffic</em>}>
				{summary.maxnetmb.maxval > 0 ? createLinkModal(<span style={{ fontSize : 16 }}>{format(",")(summary.maxnetmb.maxval)} MB</span>,
					"Max Service Network Traffic",
					(item) => item.svcnetmb === summary.maxnetmb.maxval, summary.maxnetmb.idx, summary.maxnetmb.idx + 1, summary.maxnetmb.nrecs) : "0 MB"}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Max Cluster Hosts</em>}>
				<span style={{ fontSize : 16 }}>{format(",")(summary.maxhosts.maxval)}</span>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Min Cluster Hosts</em>}>
				<span style={{ fontSize : 16 }}>{format(",")(summary.minhosts.minval)}</span>
			</Descriptions.Item>


		</Descriptions>

		{ lastitem && (

			<Descriptions title={lasttitle} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >

			{isaggregated &&
			<Descriptions.Item 
				label={<em># Aggregated Records</em>}>
				{lastitem.inrecs}
			</Descriptions.Item>
			}


			<Descriptions.Item 
				label={<em>{avgstr} # Hosts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nhosts)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} # Service Issues</em>}>
				{lastitem.nlistissue > 0 ? 
					getSvcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nlistissue)} />, 
					`( ({ host.cluster = '${cluster}' }) and ({ svcstate.state in 'Bad','Severe' }) )`,
					moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} # Hosts with Service Issues</em>}>
				{lastitem.nlisthosts > 0 ? 
					getHostStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nlisthosts)} />, 
					`( ({ host.cluster = '${cluster}' }) and ({ hoststate.nlistissue > 0 }) )`,
					isaggregated ? lastitem.time : moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} # Total Services</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nlisten)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} # Process Issues</em>}>
				{lastitem.nprocissue > 0 ? 
					getProcStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nprocissue)} />, 
					`( ({ host.cluster = '${cluster}' }) and ({ procstate.state in 'Bad','Severe' }) )`,
					isaggregated ? lastitem.time : moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} # Hosts with Process Issues</em>}>
				{lastitem.nprochosts > 0 ? 
					getHostStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nprochosts)} />, 
					`( ({ host.cluster = '${cluster}' }) and ({ hoststate.nprocissue > 0 }) )`,
					isaggregated ? lastitem.time : moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Queries/sec QPS</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.totqps)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Services Network Traffic</em>}>
				<span style={{ fontSize : 16 }}>{format(",")(lastitem.svcnetmb)} MB</span>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} # Hosts with CPU Issues</em>}>
				{lastitem.ncpuissue > 0 ? 
					getHostStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.ncpuissue)} />, 
					`( ({ host.cluster = '${cluster}' }) and ({ hoststate.cpuissue = true }) )`,
					isaggregated ? lastitem.time : moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} # Hosts with Memory Issues</em>}>
				{lastitem.nmemissue > 0 ? 
					getHostStateTable(<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.nmemissue)} />, 
					`( ({ host.cluster = '${cluster}' }) and ({ hoststate.memissue = true }) )`,
					isaggregated ? lastitem.time : moment(lastitem.time, moment.ISO_8601).subtract(5, 'seconds').format(), 
					moment(lastitem.time, moment.ISO_8601).add(isaggregated ? aggregatesec : 7, 'seconds').format()) : 0}
			</Descriptions.Item>

			</Descriptions>
			)
		}	

		</>

	);		
}


export function ClusterMonitor({cluster, isRealTime, starttime, endtime, aggregatesec, aggregatetype, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile})
{
	const 		objref = useRef(null);
	const		svcRef = useRef(null), qpsRef = useRef(null), netRef = useRef(null), procRef = useRef(null), cpumemRef = useRef(null), hostRef = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[realtimePaused, setrealtimePaused] = useState(false);
	const		[isaggregated, ] = useState(aggregatesec ? aggregatesec >= 2 * realtimesec : false);
	const		[aggroper, ] = useState(aggregatetype ?? "avg");
	const		[fetchIntervalmsec, ] = useState((isaggregated ? aggregatesec * 1000 : realtimesec * 1000));
	const		[timeSliderIndex, setTimeSlider] = useState(null);

	if (objref.current === null) {
		console.log(`ClusterMonitor initializing for first time : isRealTime=${isRealTime} starttime=${starttime} endtime=${endtime} aggregatesec=${aggregatesec} aggregatetype=${aggregatetype}`);

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
			cluster			: cluster,
		};	

		objref.current[svcTitle] 		= new ChartInfo(svcTitle, svcColumns); 	
		objref.current[qpsTitle] 		= new ChartInfo(svcTitle, qpsColumns); 	
		objref.current[netTitle] 		= new ChartInfo(svcTitle, netColumns); 	
		objref.current[procTitle] 		= new ChartInfo(svcTitle, procColumns); 	
		objref.current[cpumemTitle] 		= new ChartInfo(svcTitle, cpumemColumns); 	
		objref.current[hostTitle] 		= new ChartInfo(svcTitle, hostColumns); 	

		objref.current.realtimearray	=	[];

		objref.current.summary 		= {
			dataarr			: null,
		};	

		initSummary(objref.current.summary);
	}

	useEffect(() => {
		return () => {
			console.log(`ClusterMonitor destructor called...`);
		};	
	}, []);

	const validProps = useMemo(() => {	

		if (cluster === undefined || cluster === null) {
			throw new Error(`Mandatory cluster not specified`);
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
	}, [cluster, isRealTime, starttime, endtime]);	

	if (validProps === false) {
		// This should not occur
		throw new Error(`Internal Error : ClusterMonitor validProps check failed`);
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
				let		conf, currtime = Date.now(), isstart = false, pointintime = false;

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
					url 		: NodeApis.clusterstate, 
					method 		: 'post', 
					data 		: { 
						timeoutsec 	: isRealTime && !isaggregated ? 3 : 100,
						options		: {
							aggregate	: isaggregated, 
							aggrsec		: isaggregated ? aggregatesec : undefined,
							aggroper	: aggroper,
							filter		: `{ clusterstate.cluster = '${cluster}' }`,
							sortcolumns	: isaggregated ? [ "time" ] : undefined,
						},	
						timeoffsetsec	: isRealTime && isaggregated ? aggregatesec : undefined,
					}, 
					timeout 	: isRealTime && !isaggregated ? 3000 : 100000,
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
						else if (!isaggregated) {
							// We need to fetch the prior 5 sec interval data to ensure sync across multi Madhava's
							conf.data.starttimeoffsetsec 	= 10;
							conf.data.endtimeoffsetsec 	= 5;
							conf.data.pointintime		= true;
							
							pointintime 			= true;
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
					const 		ndata = [mergeClusterTimestamps(res.data, !pointintime /* usetimekey */)];

					setApiData({data : ndata, isloading : false, isapierror : false});
				}
				else {
					setApiData({data : [], isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Cluster State Data fetch..."});
					objref.current.nerrorretries++;
				}	

				if (isstart) {
					objref.current.isstarted = true;
				}	
			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
							description : `Exception occured while waiting for new Cluster State data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				objref.current.nerrorretries++;
				objref.current.nextfetchtime = Date.now() + 30000;
			}	
			finally {
				timer1 = setTimeout(apiCall, 1000);
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for ClusterMonitor setinterval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, cluster, isRealTime, starttime, endtime, fetchIntervalmsec, aggroper, aggregatesec, isaggregated, tabKey, isActiveTabCB, svcRef]);	
	

	const svcRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!svcRef.current) return;

					const			tref = svcRef;

					hostTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { hoststate.nlistissue > 0 } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Hosts with Service Issues</Button>

			<Button onClick={() => {
					if (!svcRef.current) return;

					const			tref = svcRef;

					svcTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { state in 'Bad','Severe' } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Services with Issues</Button>
			
			</Space>
			</>
		);
	}, [svcRef, cluster, addTabCB, remTabCB, isActiveTabCB]);	

	const qpsRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!qpsRef.current) return;

					const			tref = qpsRef;

					svcTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { qps5s > 0 } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Active Services</Button>
			</Space>
			</>
		);
	}, [qpsRef, cluster, addTabCB, remTabCB, isActiveTabCB]);	

	const netRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!netRef.current) return;

					const			tref = netRef;

					svcTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { kbin15s + kbout15s > 0 } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Services with Network Traffic</Button>
			
			</Space>
			</>
		);
	}, [netRef, cluster, addTabCB, remTabCB, isActiveTabCB]);	

	const procRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>
			<Button onClick={() => {
					if (!procRef.current) return;

					const			tref = procRef;

					hostTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { hoststate.nprocissue > 0 } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Hosts with Process Issues</Button>

			<Button onClick={() => {
					if (!procRef.current) return;

					const			tref = procRef;

					procTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { state in 'Bad','Severe' } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Processes with Issues</Button>
			

			</Space>
			</>
		);
	}, [procRef, cluster, addTabCB, remTabCB, isActiveTabCB]);	

	const cpumemRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!cpumemRef.current) return;

					const			tref = cpumemRef;

					hostTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { cpuissue = true } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Hosts with CPU Issues</Button>
			
			<Button onClick={() => {
					if (!cpumemRef.current) return;

					const			tref = cpumemRef;

					hostTableTab({
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`( { host.cluster = '${cluster}' } and { memissue = true } )`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'avg',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						name 		: 	`Cluster ${cluster}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Get Hosts with Memory Issues</Button>

			</Space>
			</>
		);
	}, [cpumemRef, cluster, addTabCB, remTabCB, isActiveTabCB]);	

	const hostRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>
			</Space>
			</>
		);
	}, [/* hostRef, cluster */]);	

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

			case qpsTitle 		: return qpsRescaleComps;

			case netTitle		: return netRescaleComps;

			case procTitle 		: return procRescaleComps;

			case cpumemTitle	: return cpumemRescaleComps;
			
			case hostTitle		: return hostRescaleComps;

			default			: return null;
		}
	}, [objref, svcRescaleComps, qpsRescaleComps, netRescaleComps, procRescaleComps, cpumemRescaleComps, hostRescaleComps]);

	const getRefFromTitle = useCallback((title) => {
		switch (title) {
			
			case svcTitle 		:	return svcRef;

			case qpsTitle		:	return qpsRef;

			case netTitle		:	return netRef;

			case procTitle		: 	return procRef;

			case cpumemTitle	: 	return cpumemRef;

			case hostTitle		: 	return hostRef;

			default			:	return null;
		};	

	}, [svcRef, qpsRef, netRef, procRef, cpumemRef, hostRef]);	

	const timeRangeCB = useCallback((title, newtimerange) => {

		console.log(`title = ${title} New Timerange CB : newtimerange = ${newtimerange}`);

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		[svcTitle, qpsTitle, netTitle, procTitle, cpumemTitle, hostTitle].forEach((item) => {
			if (item !== title) {
				const		ref = getRefFromTitle(item);

				if (ref && ref.current) {
					ref.current.setNewTimeRange(newtimerange);
				}
			}	
		});	

	}, [getRefFromTitle]);

	const timeTrackerCB = useCallback((newdate) => {

		[svcTitle, qpsTitle, netTitle, procTitle, cpumemTitle, hostTitle].forEach((item) => {
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

		const chart = (
				<>
				<GyLineChart ref={svcRef} chartTitle={svcTitle} columnInfoArr={svcColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					y1AxisTitle="# Service Issues" y2AxisTitle="Hosts with Service Issues" 
					y1AxisFormat="," y2AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getQPSChart = useCallback(() =>
	{
		const		cobj = objref.current[qpsTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		const chart = (
				<>
				<GyLineChart ref={qpsRef} chartTitle={qpsTitle} columnInfoArr={qpsColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					y1AxisTitle="Cluster Queries/sec (QPS)" y1AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	


	const getNetChart = useCallback(() =>
	{
		const		cobj = objref.current[netTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		const chart = (
				<>
				<GyLineChart ref={netRef} chartTitle={netTitle} columnInfoArr={netColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					y1AxisTitle="Services Network Traffic MB" y1AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
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

		const chart = (
				<>
				<GyLineChart ref={procRef} chartTitle={procTitle} columnInfoArr={procColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					y1AxisTitle="# Process Issues" y2AxisTitle="Hosts with Process Issues" 
					y1AxisFormat="," y2AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getCpuMemChart = useCallback(() =>
	{
		const		obj = objref.current[cpumemTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const chart = (
				<>
				<GyLineChart ref={cpumemRef} chartTitle={cpumemTitle} columnInfoArr={cpumemColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					y1AxisTitle="Hosts with CPU Issues" y2AxisTitle="Hosts with Memory Issues" 
					y1AxisFormat="," y2AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getHostChart = useCallback(() =>
	{
		const		cobj = objref.current[hostTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];

		const chart = (
				<>
				<GyLineChart ref={hostRef} chartTitle={hostTitle} columnInfoArr={hostColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					y1AxisTitle="# Cluster Hosts" y1AxisFormat="," onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
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
			{<ClusterSummary cluster={cluster} objref={objref} isRealTime={isRealTime} aggregatesec={isaggregated ? aggregatesec : undefined} aggroper={aggroper} 
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

		const			tabKey = `ClusterMonitor_${Date.now()}`;
		
		CreateTab('Cluster History', 
			() => { return <ClusterMonitor isRealTime={false} starttime={tstarttime} endtime={tendtime} cluster={cluster} 
						aggregatesec={useAggr ? aggrMin * 60 : undefined} aggregatetype={aggrType}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [cluster, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);	

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
			fstr = `( { clusterstate.cluster = '${cluster}' } and ${newfilter} )`;
		}
		else {
			fstr = `{ clusterstate.cluster = '${cluster}' }`;
		}	

		// Now close the search modal
		Modal.destroyAll();

		clusterTableTab({starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, filter : fstr, name : `Cluster '${cluster}'`, 
					maxrecs, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [cluster, addTabCB, remTabCB, isActiveTabCB]);	


	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range' showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <ClusterStateMultiQuickFilter filterCB={onfiltercb} />;
	}, []);	


	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			<ButtonModal buttontext={`Search Cluster '${cluster}' State`} width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onStateSearch} title='Search Cluster State' 
						timecompcb={timecb} filtercompcb={filtercb} ismaxrecs={true} defaultmaxrecs={50000} />
				)} />
					

			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			{isRealTime && realtimePaused === false && (<Button icon={<PauseCircleOutlined />} onClick={() => {objref.current.pauserealtime = true}}>Pause Auto Refresh</Button>)}
			{isRealTime && realtimePaused && (<Button icon={<PlayCircleOutlined />} onClick={() => {objref.current.resumerealtime = true}}>Resume Auto Refresh</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Cluster State'
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

		if (safetypeof(data) === 'array' && data.length > 0 && (safetypeof(data[0].clusterstate) === 'array') && data[0].clusterstate.length > 0) { 

			let			newdata = data[0].clusterstate, lastsec = moment(newdata[newdata.length - 1].time, moment.ISO_8601).unix();	

			if ((moment(newdata[0].time, moment.ISO_8601).unix() >= moment(objref.current.summary.starttime, moment.ISO_8601).unix()) && 
				(lastsec <= moment(objref.current.summary.endtime, moment.ISO_8601).unix())) {

				console.log(`Duplicate record seen...`);
				objref.current.nerrorretries = 0

				bodycont = getPrevCharts(<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);
			}
			else {
				if (isRealTime) {
					fixedArrayAddItems(newdata, objref.current.realtimearray, fixedArraySize);
					calcSummary(objref.current.realtimearray, objref.current.summary, isaggregated);
				}
				else {
					calcSummary(newdata, objref.current.summary, isaggregated);
				}

				/*console.log(`Summary is ${JSON.stringify(objref.current.summary)}`);*/

				const		svcissuevalid = getChartSeries(objref.current[svcTitle].chartobj_[0], newdata, isRealTime, true);
				const		svchostvalid = svcissuevalid === true && getChartSeries(objref.current[svcTitle].chartobj_[1], newdata, isRealTime, false);
				const		svcvalid = svcissuevalid === true ? svchostvalid : svcissuevalid;
				const		svcchart = svcvalid === true ? getSvcChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Service Issue chart : ${svcvalid}`} />);
		

				const		qpsvalid = getChartSeries(objref.current[qpsTitle].chartobj_[0], newdata, isRealTime);
				const		qpschart = qpsvalid === true ? getQPSChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing QPS chart : ${qpsvalid}`} />);
		
				const		netvalid = getChartSeries(objref.current[netTitle].chartobj_[0], newdata, isRealTime);
				const		netchart = netvalid === true ? getNetChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Net chart : ${netvalid}`} />);
		
		
				const		procissuevalid = getChartSeries(objref.current[procTitle].chartobj_[0], newdata, isRealTime, true);
				const		prochostvalid = procissuevalid === true && getChartSeries(objref.current[procTitle].chartobj_[1], newdata, isRealTime, false);
				const		procvalid = procissuevalid === true ? prochostvalid : procissuevalid;
				const		procchart = procvalid === true ? getProcChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Process Issue chart : ${procvalid}`} />);
		

				const		cpuvalid = getChartSeries(objref.current[cpumemTitle].chartobj_[0], newdata, isRealTime, true);
				const		memvalid = cpuvalid === true && getChartSeries(objref.current[cpumemTitle].chartobj_[1], newdata, isRealTime, false);
				const		cpumemvalid = cpuvalid === true ? memvalid : cpuvalid;
				const		cpumemchart = cpumemvalid === true ? getCpuMemChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing CPU Mem Issue chart : ${cpumemvalid}`} />);
		

				const		hostvalid = getChartSeries(objref.current[hostTitle].chartobj_[0], newdata, isRealTime);
				const		hostchart = hostvalid === true ? getHostChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Host chart : ${hostvalid}`} />);
		

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
					{qpschart}
					{netchart}
					{procchart}
					{cpumemchart}
					{hostchart}
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

				console.log(`Cluster ${cluster} State Data seen for time ${newdata[0].time}`);
			}
		}
		else {
			let		ignerr = false;

			if (objref.current.prevdatasec && moment().unix() - objref.current.prevdatasec < 60) {
				ignerr = true;
			}

			bodycont = getPrevCharts(<Alert style={{ visibility: ignerr ? "hidden" : undefined }} type="warning" showIcon 
								message="Invalid or no data seen. Will retry after a few seconds..." />);

			console.log(`Cluster State Data Invalid / No data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
			
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
			
			console.log(`Cluster State Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);

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

		<Title level={4}><em>{isaggregated ? "Aggregated" : ""} Cluster {cluster} State Monitor</em></Title>
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


