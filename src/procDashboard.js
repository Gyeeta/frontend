
import 			React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import 			moment from 'moment';
import 			axios from 'axios';

import 			{Button, Space, Slider, Descriptions, Modal, Typography, Empty, Tag, Alert, Input, notification, Row, Col, message} from 'antd';
import 			{CheckSquareTwoTone, CloseOutlined} from '@ant-design/icons';

import 			{format} from "d3-format";

import 			{FixedPrioQueue} from './components/fixedPrioQueue.js';
import 			{safetypeof, NullID, validateApi, fixedArrayAddItems, kbStrFormat, msecStrFormat, useFetchApi, CreateLinkTab, ComponentLife,
			CreateTab, mergeMultiMadhava, ButtonModal, capitalFirstLetter, ButtonJSONDescribe, stateEnum, LoadingAlert, JSONDescription,
			strTruncateTo, getMinEndtime, timeDiffString, getLocalTime, isStateIssue} from './components/util.js';
import 			{StateBadge} from './components/stateBadge.js';
import 			{HostInfoDesc} from './hostViewPage.js';
import 			{ProcMonitor, ProcIssueSource} from './procMonitor.js';
import 			{SvcInfoDesc} from './svcDashboard.js';
import 			{GyTable, getTableScroll, getFixedColumns} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{NetDashboard} from './netDashboard.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';
import			{procDashKey} from './gyeetaTabs.js';
import 			{MultiFilters, SearchTimeFilter, hostfields, SearchWrapConfig} from './multiFilters.js';

const 			{Title} = Typography;
const 			{Search} = Input;
const 			{ErrorBoundary} = Alert;

const 			maxtopelem = 50;
const			procfetchsec = 20;

export const procstatefields = [
	{ field : 'name',	desc : 'Process Name',			type : 'string',	subsys : 'procstate',	valid : null, },
	{ field : 'cpu',	desc : 'CPU Utilization %',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'rss',	desc : 'Resident Memory MB',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'cpudel',	desc : 'CPU Delay msec',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'vmdel',	desc : 'Virtual Memory Delay msec',	type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'iodel',	desc : 'Block IO Delay msec',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'netkb',	desc : 'Network Traffic KB',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'nconn',	desc : 'New Network Connections',	type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'nprocs',	desc : '# Processes within Group',	type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'pid1',	desc : 'Sample PID 1 within Group',	type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'pid2',	desc : 'Sample PID 2 within Group',	type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'nissue',	desc : '# Issue Processes',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'state',	desc : 'Process State',			type : 'enum',		subsys : 'procstate',	valid : null, 		esrc : stateEnum },
	{ field : 'issue',	desc : 'Process Issue Cause',		type : 'enum',		subsys : 'procstate',	valid : null, 		esrc : ProcIssueSource },
	{ field : 'procid',	desc : 'Process Gyeeta ID',		type : 'string',	subsys : 'procstate',	valid : null, },
	{ field : 'time',	desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'procstate',	valid : null, },
	{ field : 'desc',	desc : 'Process State Analysis',	type : 'string',	subsys : 'procstate',	valid : null, },
];	

export const aggrprocstatefields = [
	{ field : 'name',	desc : 'Process Name',				type : 'string',	subsys : 'procstate',	valid : null, },
	{ field : 'cpu',	desc : 'Group CPU Utilization %',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'rss',	desc : 'Resident Memory MB',			type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'cpudel',	desc : 'CPU Delay msec',			type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'vmdel',	desc : 'Virtual Memory Delay msec',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'iodel',	desc : 'Block IO Delay msec',			type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'netkb',	desc : 'Network Traffic KB',			type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'nconn',	desc : 'New Network Connections',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'nprocs',	desc : '# Processes within Group',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'procid',	desc : 'Process Gyeeta ID',			type : 'string',	subsys : 'procstate',	valid : null, },
	{ field : 'issue',	desc : 'Count of Process Issues',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'incpudel',	desc : 'Degrades by CPU Delays',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'iniodel',	desc : 'Degrades by IO Delays',			type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'inswpdel',	desc : 'Degrades by Memory Swapins',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'inrecdel',	desc : 'Degrades by Memory Reclaims',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'inthrdel',	desc : 'Degrades by Memory Thrashing',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'invcsw',	desc : 'Degrades by Voluntary Context Switch',	type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'inivcsw',	desc : 'Degrades by Involuntary Context Switch',type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'inpgflt',	desc : 'Degrades by Major Page Fault',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'incpu',	desc : 'Degrades by High CPU util',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'instop',	desc : 'Degrades by Process Suspends',		type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'inptr',	desc : 'Degrades by Kernel/Trace Suspend',	type : 'number',	subsys : 'procstate',	valid : null, },
	{ field : 'inrecs',	desc : '# Records in Aggregation',		type : 'number',	subsys : 'procstate',	valid : null, },
];	


export const extprocfields = [
	{ field : 'cmdline',	desc : 'Process Command Line',		type : 'string',	subsys : 'extprocstate',	valid : null, },
	{ field : 'region',	desc : 'Region Name',			type : 'string',	subsys : 'extprocstate',	valid : null, },
	{ field : 'zone',	desc : 'Zone Name',			type : 'string',	subsys : 'extprocstate',	valid : null, },
	{ field : 'tag',	desc : 'Process Tag Name',		type : 'string',	subsys : 'extprocstate',	valid : null, },
	{ field : 'uid',	desc : 'User ID number',		type : 'number',	subsys : 'extprocstate',	valid : null, },
	{ field : 'gid',	desc : 'Group ID number',		type : 'number',	subsys : 'extprocstate',	valid : null, },
	{ field : 'cputhr',	desc : 'CPU Throttled Process',		type : 'boolean',	subsys : 'extprocstate',	valid : null, },
	{ field : 'memlim',	desc : 'Memory Limited Process',	type : 'boolean',	subsys : 'extprocstate',	valid : null, },
	{ field : 'tstart',	desc : 'Process Start Time',		type : 'timestamptz',	subsys : 'extprocstate',	valid : null, },
	{ field : 'relsvcid',	desc : 'Process Service Relative ID',	type : 'string',	subsys : 'extprocstate',	valid : null, },
	{ field : 'p95cpupct',	desc : 'p95 Process CPU %',		type : 'number',	subsys : 'extprocstate',	valid : null, },
	{ field : 'p95cpudel',	desc : 'p95 CPU Delay msec',		type : 'number',	subsys : 'extprocstate',	valid : null, },
	{ field : 'p95iodel',	desc : 'p95 Block IO Delay msec',	type : 'number',	subsys : 'extprocstate',	valid : null, },
	{ field : 'cgcpulimpct',desc : 'CPU cgroup Limit %',		type : 'number',	subsys : 'extprocstate',	valid : null, },
	{ field : 'cgrsspct',	desc : 'cgroup Resident Memory %',	type : 'number',	subsys : 'extprocstate',	valid : null, },
];

export const procinfofields = [
	{ field : 'name',	desc : 'Process Name',			type : 'string',	subsys : 'procinfo',	valid : null, },
	{ field : 'cmdline',	desc : 'Process Command Line',		type : 'string',	subsys : 'procinfo',	valid : null, },
	{ field : 'region',	desc : 'Region Name',			type : 'string',	subsys : 'procinfo',	valid : null, },
	{ field : 'zone',	desc : 'Zone Name',			type : 'string',	subsys : 'procinfo',	valid : null, },
	{ field : 'tag',	desc : 'Process Tag Name',		type : 'string',	subsys : 'procinfo',	valid : null, },
	{ field : 'tstart',	desc : 'Process Start Time',		type : 'timestamptz',	subsys : 'procinfo',	valid : null, },
	{ field : 'uid',	desc : 'User ID number',		type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'gid',	desc : 'Group ID number',		type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'hicap',	desc : 'Is Privileged Process',		type : 'boolean',	subsys : 'procinfo',	valid : null, },
	{ field : 'cputhr',	desc : 'CPU Throttled Process',		type : 'boolean',	subsys : 'procinfo',	valid : null, },
	{ field : 'memlim',	desc : 'Memory Limited Process',	type : 'boolean',	subsys : 'procinfo',	valid : null, },
	{ field : 'rtproc',	desc : 'Is Realtime Process',		type : 'boolean',	subsys : 'procinfo',	valid : null, },
	{ field : 'conproc',	desc : 'Is a Container Process',	type : 'boolean',	subsys : 'procinfo',	valid : null, },
	{ field : 'nproc',	desc : '# Processes within Group',	type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'nthr',	desc : '# Threads in Process',		type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'relsvcid',	desc : 'Process Service Relative ID',	type : 'string',	subsys : 'procinfo',	valid : null, },
	{ field : 'p95cpupct',	desc : 'p95 Process CPU %',		type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'p95cpudel',	desc : 'p95 CPU Delay msec',		type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'p95iodel',	desc : 'p95 Block IO Delay msec',	type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'cgcpulimpct',desc : 'CPU cgroup Limit %',		type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'cgrsspct',	desc : 'cgroup Resident Memory %',	type : 'number',	subsys : 'procinfo',	valid : null, },
	{ field : 'time',	desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'procinfo',	valid : null, },
	{ field : 'procid',	desc : 'Process Gyeeta ID',		type : 'string',	subsys : 'procinfo',	valid : null, },
];



function norm_top_processes(origdata, rectime)
{
	if (Array.isArray(origdata) !== true) {
		return origdata;
	}	
	
	if (origdata.length === 0) {
		return origdata;
	}	
	else if (origdata.length >= 1) {
		// Check toprss or topcpu for time
		if (origdata[0].topaggr && origdata[0].topaggr.toprss && Array.isArray(origdata[0].topaggr.toprss) && origdata[0].topaggr.toprss.length > 0) {
			origdata[0].rectime = origdata[0].topaggr.toprss[0].time;
		}	
		else if (origdata[0].topaggr && origdata[0].topaggr.topcpu && Array.isArray(origdata[0].topaggr.topcpu) && origdata[0].topaggr.topcpu.length > 0) {
			origdata[0].rectime = origdata[0].topaggr.topcpu[0].time;
		}	
		else if (origdata[0].tophost && origdata[0].tophost.toprss && Array.isArray(origdata[0].tophost.toprss) && origdata[0].tophost.toprss.length > 0) {
			origdata[0].rectime = origdata[0].tophost.topcpu[0].time;
		}	
		else if (rectime) {
			origdata[0].rectime = rectime;
		}	
		else {
			origdata[0].rectime = moment().format();
		}	
	}	

	if (origdata.length === 1) {
		return origdata;
	}

	const		normdata = [{ rectime : origdata[0].rectime, topaggr : {}, }];
	const		normaggr = normdata[0].topaggr;

	let		prioissue, priocpu, priorss, priocpudelay, priovmdelay, prioiodelay, prionet;
	let		topaggr = origdata[0].topaggr;

	if (topaggr.topissue) {
		normaggr.topissue 	= [];
		prioissue 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.state === 'Severe' && lhs.state !== 'Severe' });
	}	

	if (topaggr.topcpu) {
		normaggr.topcpu 	= [];
		priocpu 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.cpu - lhs.cpu });
	}	

	if (topaggr.toprss) {
		normaggr.toprss 	= [];
		priorss 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.rss - lhs.rss });
	}	

	if (topaggr.topcpudelay) {
		normaggr.topcpudelay 	= [];
		priocpudelay 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.cpudel - lhs.cpudel });
	}	

	if (topaggr.topvmdelay) {
		normaggr.topvmdelay 	= [];
		priovmdelay 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.vmdel - lhs.vmdel });
	}	

	if (topaggr.topiodelay) {
		normaggr.topiodelay 	= [];
		prioiodelay 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.iodel - lhs.iodel });
	}	

	if (topaggr.topnet) {
		normaggr.topnet 	= [];
		prionet 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.netkb - lhs.netkb });
	}	

	for (let madhava of origdata) {
		topaggr = madhava.topaggr;

		if (!topaggr) {
			continue;
		}	

		if (prioissue && topaggr.topissue && Array.isArray(topaggr.topissue)) {
			for (let i = 0; i < topaggr.topissue.length; ++i) {
				prioissue.pushdata(topaggr.topissue[i]);
			}	
		}	

		if (priocpu && topaggr.topcpu && Array.isArray(topaggr.topcpu)) {
			for (let i = 0; i < topaggr.topcpu.length; ++i) {
				priocpu.pushdata(topaggr.topcpu[i]);
			}	
		}	

		if (priorss && topaggr.toprss && Array.isArray(topaggr.toprss)) {
			for (let i = 0; i < topaggr.toprss.length; ++i) {
				priorss.pushdata(topaggr.toprss[i]);
			}	
		}	

		if (priocpudelay && topaggr.topcpudelay && Array.isArray(topaggr.topcpudelay)) {
			for (let i = 0; i < topaggr.topcpudelay.length; ++i) {
				priocpudelay.pushdata(topaggr.topcpudelay[i]);
			}	
		}	

		if (priovmdelay && topaggr.topvmdelay && Array.isArray(topaggr.topvmdelay)) {
			for (let i = 0; i < topaggr.topvmdelay.length; ++i) {
				priovmdelay.pushdata(topaggr.topvmdelay[i]);
			}	
		}	

		if (prioiodelay && topaggr.topiodelay && Array.isArray(topaggr.topiodelay)) {
			for (let i = 0; i < topaggr.topiodelay.length; ++i) {
				prioiodelay.pushdata(topaggr.topiodelay[i]);
			}	
		}	

		if (prionet && topaggr.topnet && Array.isArray(topaggr.topnet)) {
			for (let i = 0; i < topaggr.topnet.length; ++i) {
				prionet.pushdata(topaggr.topnet[i]);
			}	
		}	
	}	

	if (prioissue && prioissue.size()) {
		prioissue.popsorted((data) => { normaggr.topissue.push(data); });
	}	

	if (priocpu && priocpu.size()) {
		priocpu.popsorted((data) => { normaggr.topcpu.push(data); });
	}	

	if (priorss && priorss.size()) {
		priorss.popsorted((data) => { normaggr.toprss.push(data); });
	}	

	if (priocpudelay && priocpudelay.size()) {
		priocpudelay.popsorted((data) => { normaggr.topcpudelay.push(data); });
	}	

	if (priovmdelay && priovmdelay.size()) {
		priovmdelay.popsorted((data) => { normaggr.topvmdelay.push(data); });
	}	

	if (prioiodelay && prioiodelay.size()) {
		prioiodelay.popsorted((data) => { normaggr.topiodelay.push(data); });
	}	

	if (prionet && prionet.size()) {
		prionet.popsorted((data) => { normaggr.topnet.push(data); });
	}	

	return normdata;
}

const hostAggrCol = [
	{
		title :		'Process',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	120,
		render : 	text => <Button type="link">{text}</Button>,
		fixed :		'left',
	},	
	{
		title :		'Process State',
		key :		'state',
		dataIndex :	'state',
		gytype :	'string',
		width : 	100,
		render : 	state => StateBadge(state, state),
	},	
	{
		title :		'CPU %',
		key :		'cpu',
		dataIndex :	'cpu',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'Memory RSS MB',
		key :		'rss',
		dataIndex :	'rss',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'Network Traffic',
		key :		'netkb',
		dataIndex :	'netkb',
		gytype :	'number',
		width : 	120,
		render :	(num) => kbStrFormat(num),
	},
	{
		title :		'New Net Connections',
		key :		'nconn',
		dataIndex :	'nconn',
		gytype :	'number',
		width : 	120,
		render :	(num) => format(",")(num),
	},

	{
		title :		'CPU Delay',
		key :		'cpudel',
		dataIndex :	'cpudel',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'IO Delay',
		key :		'iodel',
		dataIndex :	'iodel',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'Memory Delay',
		key :		'vmdel',
		dataIndex :	'vmdel',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'# Issue Processes',
		key :		'nissue',
		dataIndex :	'nissue',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : undefined }} >{num} of {rec.nprocs}</span>,
	},
	{
		title :		'Process Issue Cause',
		key :		'issue',
		dataIndex :	'issue',
		gytype :	'number',
		width : 	150,
		responsive : 	['lg'],
		render :	(num) => ProcIssueSource[num] ? ProcIssueSource[num].name : '',
	},
	{
		title :		'State Description',
		key :		'desc',
		dataIndex :	'desc',
		gytype :	'string',
		responsive : 	['lg'],
		width : 	300,
		render :	(val, rec) => <span style={{ color : isStateIssue(rec.state) ? 'red' : undefined }} >{strTruncateTo(val, 100)}</span>,
	},
	
];

const globAggrCol = [

	...hostAggrCol,

	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		width :		150,
		fixed : 	'right',
	},
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		responsive : 	['lg'],
		width :		150,
		fixed : 	'right',
	},
];

export const hostAggrRangeCol = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed :		'left',
		render :	(val) => getLocalTime(val),
	},
	...hostAggrCol,
];

const globAggrRangeCol = [
	...hostAggrRangeCol,

	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		width :		150,
		fixed : 	'right',
	},
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		responsive : 	['lg'],
		width :		150,
		fixed : 	'right',
	},
];

export const aggrHostAggrCol = (aggrType) => {

	aggrType 		= capitalFirstLetter(aggrType) ?? 'Avg';

	const			astr = aggrType ?? 'Avg';
	const			ignsum = aggrType === 'Sum' ? 'Avg' : aggrType;

	return [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed :		'left',
		render :	(val) => getLocalTime(val),
	},
	{
		title :		'Process',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		fixed :		'left',
		width : 	120,
		render : 	text => <Button type="link">{text}</Button>,
	},	
	{
		title :		`${ignsum} CPU %`,
		key :		'cpu',
		dataIndex :	'cpu',
		gytype :	'number',
		width : 	120,
	},
	{
		title :		`${ignsum} Memory RSS MB`,
		key :		'rss',
		dataIndex :	'rss',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		`# Process Issues`,
		key :		'issue',
		dataIndex :	'issue',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : 'green' }} >{num} of {rec.inrecs}</span>,
	},
	{
		title :		`${astr} Network Traffic`,
		key :		'netkb',
		dataIndex :	'netkb',
		gytype :	'number',
		width : 	120,
		render :	(num) => kbStrFormat(num),
	},
	{
		title :		`${astr} CPU Delay`,
		key :		'cpudel',
		dataIndex :	'cpudel',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		`${astr} IO Delay`,
		key :		'iodel',
		dataIndex :	'iodel',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		`${astr} Memory Delay`,
		key :		'vmdel',
		dataIndex :	'vmdel',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		`${ignsum} # Processes`,
		key :		'nprocs',
		dataIndex :	'nprocs',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		`${astr} # New TCP Conns`,
		key :		'nconn',
		dataIndex :	'nconn',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'# Records',
		key :		'inrecs',
		dataIndex :	'inrecs',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'Degrades by CPU Delays',
		key :		'incpudel',
		dataIndex :	'incpudel',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by IO Delays',
		key :		'iniodel',
		dataIndex :	'iniodel',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Mem Swapins',
		key :		'inswpdel',
		dataIndex :	'inswpdel',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Mem Reclaims',
		key :		'inrecdel',
		dataIndex :	'inrecdel',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Mem Thrashing',
		key :		'inthrdel',
		dataIndex :	'inthrdel',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Vol Context Switch',
		key :		'invcsw',
		dataIndex :	'invcsw',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Invol Context Switch',
		key :		'inivcsw',
		dataIndex :	'inivcsw',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Major Page Fault',
		key :		'inpgflt',
		dataIndex :	'inpgflt',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by High CPU',
		key :		'incpu',
		dataIndex :	'incpu',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Proc Suspend',
		key :		'instop',
		dataIndex :	'instop',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Kernel/Trace Suspend',
		key :		'inptr',
		dataIndex :	'inptr',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},

	];
};	

const globAggrGlobAggrCol = (aggrType) => {
	return [
	...aggrHostAggrCol(aggrType),
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		width :		150,
		fixed : 	'right',
	},
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		responsive : 	['lg'],
		width :		150,
		fixed : 	'right',
	},

	];
};	

const hostCpuRssCol = [
	{
		title :		'Process',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	120,
	},	
	{
		title :		'CPU %',
		key :		'cpu',
		dataIndex :	'cpu',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'Memory RSS MB',
		key :		'rss',
		dataIndex :	'rss',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'PID',
		key :		'pid',
		dataIndex :	'pid',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
];

const hostCpuRssRangeCol = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed :		'left',
		render :	(val) => getLocalTime(val),
	},
	...hostCpuRssCol,
];

const hostPgCpuCol = [
	{
		title :		'Process Group Name',
		key :		'pgname',
		dataIndex :	'pgname',
		gytype : 	'string',
		width : 	100,
	},	
	{
		title :		'# Child Processes',
		key :		'nprocs',
		dataIndex :	'nprocs',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'Child 1 Process Name',
		key :		'cname',
		dataIndex :	'cname',
		gytype : 	'string',
		width : 	100,
	},	
	{
		title :		'Total CPU %',
		key :		'tcpu',
		dataIndex :	'tcpu',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'Total Memory RSS MB',
		key :		'trss',
		dataIndex :	'trss',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'Process Group PID',
		key :		'pgpid',
		dataIndex :	'pgpid',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
];

const hostPgCpuRangeCol = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed :		'left',
		render :	(val) => getLocalTime(val),
	},
	...hostPgCpuCol,
];


const hostForkCol = [
	{
		title :		'Process',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	100,
	},	
	{
		title :		'New Processes/sec',
		key :		'forksec',
		dataIndex :	'forksec',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'PID',
		key :		'pid',
		dataIndex :	'pid',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
];

const hostForkRangeCol = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed :		'left',
		render :	(val) => getLocalTime(val),
	},
	...hostForkCol,
];

const extprocColumns = [
	{
		title :		'Command Line',
		key :		'cmdline',
		dataIndex :	'cmdline',
		gytype : 	'string',
		responsive : 	['lg'],
		render :	(val) => strTruncateTo(val, 64),
		width :		200,
	},	
	{
		title :		'Start Time',
		key :		'tstart',
		dataIndex :	'tstart',
		gytype : 	'string',
		width :		160,
	},	
	{
		title :		'Region Name',
		key :		'region',
		dataIndex :	'region',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		120,
	},	
	{
		title :		'Zone Name',
		key :		'zone',
		dataIndex :	'zone',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		120,
	},	
	{
		title :		'Tag Name',
		key :		'tag',
		dataIndex :	'tag',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		150,
	},	
	{
		title :		'Service Process',
		key :		'relsvcid',
		dataIndex :	'relsvcid',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		100,
		render : 	(val, rec) => (val !== NullID ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'red'}}/>),
	},	
	{
		title :		'CPU Throttled Process',
		key :		'cputhr',
		dataIndex :	'cputhr',
		gytype : 	'boolean',
		responsive : 	['lg'],
		width :		100,
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
	},	
	{
		title :		'Memory Limited',
		key :		'memlim',
		dataIndex :	'memlim',
		gytype : 	'boolean',
		responsive : 	['lg'],
		width :		100,
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
	},	
	{
		title :		'User ID Number',
		key :		'uid',
		dataIndex :	'uid',
		gytype : 	'number',
		responsive : 	['lg'],
		width :		100,
	},	
	{
		title :		'Group ID Number',
		key :		'gid',
		dataIndex :	'gid',
		gytype : 	'number',
		responsive : 	['lg'],
		width :		100,
	},	
	{
		title :		'p95 CPU %',
		key :		'p95cpupct',
		dataIndex :	'p95cpupct',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'p95 CPU Delay',
		key :		'p95cpudel',
		dataIndex :	'p95cpudel',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{	
		title :		'p95 IO Delay',
		key :		'p95iodel',
		dataIndex :	'p95iodel',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'CPU cgroup Limit %',
		key :		'cgcpulimpct',
		dataIndex :	'cgcpulimpct',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'Mem cgroup RSS %',
		key :		'cgrsspct',
		dataIndex :	'cgrsspct',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
];

function getProcinfoColumns(istime, useHostFields)
{
	const colarr = [], harr = [];

	if (istime) {
		colarr.push({
			title :		'Time',
			key :		'time',
			dataIndex :	'time',
			gytype :	'string',
			width :		160,
			fixed : 	'left',
			render :	(val) => getLocalTime(val),
		});
	}


	const tarr = [
		{
			title :		'Process Name',
			key :		'name',
			dataIndex :	'name',
			gytype : 	'string',
			width : 	120,
			render : 	text => <Button type="link">{text}</Button>,
			fixed : 	'left',
		},	
		{
			title :		'Command Line',
			key :		'cmdline',
			dataIndex :	'cmdline',
			gytype : 	'string',
			responsive : 	['lg'],
			render :	(val) => strTruncateTo(val, 64),
			width :		200,
		},	
		{
			title :		'Start Time',
			key :		'tstart',
			dataIndex :	'tstart',
			gytype : 	'string',
			width :		160,
			render : 	(val) => timeDiffString(val),
		},	
		{
			title :		'CPU Throttled Process',
			key :		'cputhr',
			dataIndex :	'cputhr',
			gytype : 	'boolean',
			responsive : 	['lg'],
			width :		100,
			render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		},	
		{
			title :		'Memory Limited Process',
			key :		'memlim',
			dataIndex :	'memlim',
			gytype : 	'boolean',
			responsive : 	['lg'],
			width :		100,
			render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		},	
		{
			title :		'# Processes',
			key :		'nproc',
			dataIndex :	'nproc',
			gytype : 	'number',
			responsive : 	['lg'],
			width :		100,
		},	
				{
			title :		'# Threads',
			key :		'nthr',
			dataIndex :	'nthr',
			gytype : 	'number',
			responsive : 	['lg'],
			width :		100,
		},	
		{
			title :		'p95 CPU %',
			key :		'p95cpupct',
			dataIndex :	'p95cpupct',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
		},
		{
			title :		'p95 CPU Delay',
			key :		'p95cpudel',
			dataIndex :	'p95cpudel',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => msecStrFormat(num),
		},
		{	
			title :		'p95 IO Delay',
			key :		'p95iodel',
			dataIndex :	'p95iodel',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => msecStrFormat(num),
		},
		{
			title :		'CPU cgroup Limit %',
			key :		'cgcpulimpct',
			dataIndex :	'cgcpulimpct',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
		},
		{
			title :		'Mem cgroup RSS %',
			key :		'cgrsspct',
			dataIndex :	'cgrsspct',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
		},
		{
			title :		'Tag Name',
			key :		'tag',
			dataIndex :	'tag',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
		},	
		{
			title :		'Privileged Process',
			key :		'hicap',
			dataIndex :	'hicap',
			gytype : 	'boolean',
			responsive : 	['lg'],
			width :		100,
			render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		},	
		{
			title :		'Realtime Process',
			key :		'rtproc',
			dataIndex :	'rtproc',
			gytype : 	'boolean',
			responsive : 	['lg'],
			width :		100,
			render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		},	
		{
			title :		'Container Process',
			key :		'conproc',
			dataIndex :	'conproc',
			gytype : 	'boolean',
			responsive : 	['lg'],
			width :		100,
			render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		},	

		{
			title :		'Service Process',
			key :		'relsvcid',
			dataIndex :	'relsvcid',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		100,
			render : 	(val, rec) => (val !== NullID ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'red'}}/>),
		},	
		{
			title :		'User ID Number',
			key :		'uid',
			dataIndex :	'uid',
			gytype : 	'number',
			responsive : 	['lg'],
			width :		100,
		},	
		{
			title :		'Group ID Number',
			key :		'gid',
			dataIndex :	'gid',
			gytype : 	'number',
			responsive : 	['lg'],
			width :		100,
		},	
		{
			title :		'Region Name',
			key :		'region',
			dataIndex :	'region',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		120,
		},	
		{
			title :		'Zone Name',
			key :		'zone',
			dataIndex :	'zone',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		120,
		},	
	];

	if (useHostFields) {
		harr.push({
			title :		'Host',
			key :		'host',
			dataIndex :	'host',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'right',
		});

		harr.push({
			title :		'Cluster Name',
			key :		'cluster',
			dataIndex :	'cluster',
			gytype :	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'right',
		});
	}

	return [...colarr, ...tarr, ...harr];
}


export function ProcStateQuickFilters({filterCB, useHostFields})
{
	if (typeof filterCB !== 'function') return null;

	const 		numregex = /^\d+$/;

	const onName = (value) => {
		filterCB(`{ name ~ ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onBadProc = (value) => {
		filterCB(`{ state in 'Bad','Severe' }`);
	};	

	const onCPU = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ cpu > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onRSS = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ rss > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onNet = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ netkb > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onCPUDelay = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ cpudel > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onIODelay = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ iodel > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onHost = (value) => {
		filterCB(`{ host ~ ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onCluster = (value) => {
		filterCB(`{ host.cluster ~ ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	


	return (
	<>	

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Process Name Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onName} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Process State is Bad or Severe </strong></i></span>
	</div>
	<div style={{ width : 270, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onBadProc} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Grouped Processes with CPU % greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="CPU" allowClear onSearch={onCPU} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Processes with Resident Memory MB greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="RSS MB" allowClear onSearch={onRSS} style={{ width: 200 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Processes with Network Traffic KB greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Net KB" allowClear onSearch={onNet} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Processes CPU Delay msec greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Delay msec" allowClear onSearch={onCPUDelay} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Processes Block IO Delay msec greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Delay msec" allowClear onSearch={onIODelay} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	{useHostFields === true && 
		<>
		<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
		<div>
		<span style={{ fontSize : 14 }}><i><strong>Hostname Like </strong></i></span>
		</div>
		<div>
		<Search placeholder="Regex like" allowClear onSearch={onHost} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
		</div>
		</div>
		</>}

	{useHostFields === true && 
		<>
		<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
		<div>
		<span style={{ fontSize : 14 }}><i><strong>Cluster Name Like </strong></i></span>
		</div>
		<div>
		<Search placeholder="Regex like" allowClear onSearch={onCluster} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
		</div>
		</div>
		</>}


	</>
	);
}	

export function ProcStateMultiQuickFilter({filterCB, useHostFields, showquickfilter = true, isext = false, linktext, quicklinktext})
{
	const		objref = useRef(null);

	if (objref.current === null) {
		objref.current = {
			modal		:	null,
		};	
	}

	const onFilterCB = useCallback((newfilter) => {
		if (objref.current.modal) {
			objref.current.modal.destroy();
			objref.current.modal = null;
		}

		if (newfilter && newfilter.length > 0 && typeof filterCB === 'function') {
			filterCB(newfilter);
		}	
		
	}, [objref, filterCB]);

	const multifilters = useCallback(() => {
		
		objref.current.modal = Modal.info({
			title : <Title level={4}>Process State Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={isext ? [...procstatefields, ...extprocfields] : procstatefields} 
						useHostFields={useHostFields} title='Process Advanced Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields, isext]);	

	const quickfilter = useCallback(() => {
		objref.current.modal = Modal.info({
			title : <Title level={4}>Process State Quick Filters</Title>,

			content : <ProcStateQuickFilters filterCB={onFilterCB} useHostFields={useHostFields} />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields]);

	return (
		<>
		<Space>
		{showquickfilter && <Button onClick={quickfilter} >{quicklinktext ?? "Quick Filters"}</Button>}
		{showquickfilter && <span> OR </span>}
		<Button onClick={multifilters} >{linktext ?? "Advanced Filters"}</Button>
		</Space>
		</>
	);	

}

export function ProcStateAggrFilter({filterCB, isext, linktext})
{
	const		objref = useRef(null);

	if (objref.current === null) {
		objref.current = {
			modal		:	null,
		};	
	}

	const onFilterCB = useCallback((newfilter) => {
		if (objref.current.modal) {
			objref.current.modal.destroy();
			objref.current.modal = null;
		}

		if (newfilter && newfilter.length > 0 && typeof filterCB === 'function') {
			filterCB(newfilter);
		}	
		
	}, [objref, filterCB]);

	const multifilters = useCallback(() => {
		
		objref.current.modal = Modal.info({
			title : <Title level={4}>Process State Aggregation Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} 
					filterfields={isext ? [...aggrprocstatefields, ...extprocfields] : aggrprocstatefields} title='Process State Aggregation Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, isext]);	

	return <Button onClick={multifilters} >{linktext ?? "Optional Post Aggregation Filters"}</Button>;	
}

export function ProcinfoFilter({filterCB, linktext, useHostFields})
{
	const		objref = useRef(null);

	if (objref.current === null) {
		objref.current = {
			modal		:	null,
		};	
	}

	const onFilterCB = useCallback((newfilter) => {
		if (objref.current.modal) {
			objref.current.modal.destroy();
			objref.current.modal = null;
		}

		if (newfilter && newfilter.length > 0 && typeof filterCB === 'function') {
			filterCB(newfilter);
		}	
		
	}, [objref, filterCB]);

	const multifilters = useCallback(() => {
		
		objref.current.modal = Modal.info({
			title : <Title level={4}>Process Info Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={procinfofields} useHostFields={useHostFields} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields]);	

	return <Button onClick={multifilters} >{linktext ?? "Process Info Filters"}</Button>;	
}

export async function getProcUpstreamSvcids({procid, parid, starttime, endtime, addTabCB, remTabCB, isActiveTabCB})
{
	try {
		if (!procid || !parid) {
			return [];
		}

		let				conf, res;
		
		conf = {
			url 		: NodeApis.clientconn, 
			method 		: 'post', 
			data 		: { 
				starttime	: starttime,
				endtime		: endtime,
				timeoutsec 	: 100,
				parid		: parid,
				options		: {
					aggregate	: starttime && endtime ? true : undefined,
					aggrsec 	: 30000000,
					filter		: `{ cprocid = '${procid}' }`,
					onlyremote	: false,
					columns 	: ["parid", "cprocid", "svcid", "sparid"],
					maxrecs		: 200,
				},	
			}, 
			timeout 	: 100 * 1000,
		};

		res = await axios(conf);

		validateApi(res.data);

		if (safetypeof(res.data) === 'array' && (res.data.length === 1) && safetypeof(res.data[0].clientconn) === 'array' && res.data[0].clientconn.length) { 
			return res.data[0].clientconn;
		}

		return [];
	}
	catch(e) {
		console.log(`Exception caught while waiting for Upstream svc info fetch response : ${e}\n${e.stack}\n`);
		return [];
	}	
}

function parseProcSvcInfo(apidata)
{
	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Service Info data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Process Service Info Error seen : ${apidata[0].errmsg}`);
	}	

	if (!(apidata.length >= 1 && ('array' === safetypeof(apidata[0].svcinfo)))) {
		return {};
	}	

	return apidata[0];
}


function getProcSvcConf(parid, relsvcid, starttime)
{
	if (!parid) {
		throw new Error(`Mandatory parid property missing for Process Service Info`);
	}

	if (!relsvcid) {
		throw new Error(`Mandatory relsvcid property missing for Process Service Info`);
	}

	const		filter = `{ svcinfo.relsvcid = '${relsvcid}' }`; 

	return {
		url 	: NodeApis.svcinfo,
		method	: 'post',
		data 	: {
			qrytime		: Date.now(),
			starttime	: starttime,
			timeoutsec 	: 30,
			parid		: parid,
			filter		: filter,
		},
		timeout	: 30000,
	};	
}	

function parseProcInfo(apidata)
{
	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Process Info data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Process Info Error seen : ${apidata[0].errmsg}`);
	}	

	if (!(apidata.length === 1 && ('array' === safetypeof(apidata[0].procinfo)) && apidata[0].procinfo.length && ('object' === safetypeof(apidata[0].procinfo[0])))) {
		return {};
	}	

	return apidata[0];
}

function getProcInfoApiConf(procid, parid, starttime)
{
	if (!procid) {
		throw new Error(`Mandatory procid property missing for Process Info`);
	}

	return {
		url 	: NodeApis.procinfo,
		method	: 'post',
		data 	: {
			qrytime		: Date.now(),
			starttime	: starttime,
			timeoutsec 	: 30,
			parid		: parid,
			filter		: `{ procid = '${procid}' }`,
		},
		timeout	: 30000,
	};	
}	

// Will use relsvcid if specified or else will fetch procinfo and get new relsvcid
export function ProcSvcInfo({procid, relsvcid, procname, parid, starttime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const 		[{ data, isloading, isapierror }, doFetch] = useFetchApi(!relsvcid ? getProcInfoApiConf(procid, parid, starttime) : getProcSvcConf(parid, relsvcid, starttime), 
									!relsvcid ? parseProcInfo : parseProcSvcInfo, [], !relsvcid ? 'Process Info API' : 'Process Service Info API');
	let		title = null, hinfo = null;

	useEffect(() => {
		const fetchData = async () => {
			if (!relsvcid && isloading === false && isapierror === false && safetypeof(data) === 'object' && data.procinfo) {
				try {
					const			proc = data.procinfo[0];
					const			issvc = (proc.relsvcid !== NullID);

					if (!issvc) {
						return;
					}	

					doFetch({config : getProcSvcConf(parid, proc.relsvcid), xfrmresp : parseProcSvcInfo});
				}
				catch(e) {
					notification.error({message : "Data Fetch Exception Error", 
							description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
				}	
		
			}
		};

		fetchData();

	}, [procid, relsvcid, procname, parid, data, isloading, isapierror, doFetch]);

	if (isloading === false && isapierror === false) { 
	
		if (safetypeof(data) === 'object' && data.svcinfo) { 
			
			title = (<div style={{ textAlign : 'center' }}><Title level={4}>{data.svcinfo.length} Service Listeners for Grouped Process <em>{procname || ''}</em></Title></div>);

			hinfo = data.svcinfo.map((rec, index) => ( <SvcInfoDesc svcid={rec.svcid} parid={parid} starttime={starttime} key={index}  isTabletOrMobile={isTabletOrMobile} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} /> ));
		}
		else if (safetypeof(data) === 'object' && data.procinfo) { 
			if (data.procinfo[0].relsvcid === NullID) {
				title = (<div style={{ textAlign : 'center' }}><Title level={4}>Grouped Process <em>{procname}</em> has no Service Listeners</Title></div>);
				hinfo = null;
			}
			else {
				hinfo = <LoadingAlert />;
			}	
		}
		else {
			hinfo = (<Alert type="error" showIcon message="Invalid or No Valid data found on server..." description=<Empty /> />);
			console.log(`Process Svc Info Data Invalid seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		
		console.log(`Process Svc Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
	}	
	else {
		hinfo = <LoadingAlert />;
	}

	return (
		<>
		<ErrorBoundary>
		{title}
		{hinfo}
		</ErrorBoundary>
		</>
	);
}


// Specify procInfoObj if data already available 
export function ProcInfoDesc({procid, parid, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile, procInfoObj})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi(!procInfoObj ? getProcInfoApiConf(procid, parid, starttime) : null, parseProcInfo, 
										!procInfoObj ? [] : [{procinfo : [procInfoObj]}], 'Process Info API', !procInfoObj);

	let			hinfo = null;

	const getProcMonitor = () => {
		const		tabKey = `ProcMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Process State Realtime Monitor</i></span>, 'Process Realtime Monitor', 
					() => { return <ProcMonitor procid={procid} parid={parid} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getProcTimeState = () => {
		const			tabKey = `ProcTime_${Date.now()}`;
		const			tstart = moment(starttime, starttime ? moment.ISO_8601 : undefined).subtract(5, 'minute').format();
		const			tend = endtime ?? moment(starttime, starttime ? moment.ISO_8601 : undefined).add(1, 'minute').format();

		return CreateLinkTab(<span><i>Process Historical State</i></span>, 'Process Historical State', 
					() => { return <ProcMonitor procid={procid} parid={parid} isRealTime={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Process Host Info</strong></span>,
			content : <HostInfoDesc parid={parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	



	const getProcSvc = () => {
		const			proc = data.procinfo[0];

		Modal.info({
			title : <span><strong>Services of Process {proc.name}</strong></span>,
			content : <ProcSvcInfo procid={procid} procname={proc.name} parid={parid ?? proc.parid} relsvcid={proc.relsvcid} starttime={starttime} isTabletOrMobile={isTabletOrMobile} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getNetFlows = () => {
		const		tstart = moment(starttime, starttime ? moment.ISO_8601 : undefined).subtract(5, 'minute').format();
		const		tend = endtime ?? moment(starttime, starttime ? moment.ISO_8601 : undefined).add(1, 'minute').format();

		const		tabKey = `NetFlow_${Date.now()}`;
		
		const		proc = data.procinfo[0];

		return CreateLinkTab(<span><i>Process Network Flows</i></span>, 'Network Flows', 
					() => { return <NetDashboard procid={procid} procname={proc.name} parid={parid ?? proc.parid} autoRefresh={false} refreshSec={30} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};


	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && data.procinfo && data.procinfo[0].procid && data.procinfo[0].procid === procid) { 
			const			proc = data.procinfo[0];
			const			issvc = (proc.relsvcid !== NullID);

			hinfo = (
			<>
			<Descriptions title={`Grouped Process '${proc.name}' Info`} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>

			<Descriptions.Item label={<em>Host Name</em>}>{data.hostinfo ? data.hostinfo.host : proc.host ? proc.host : 'Unknown'}</Descriptions.Item>
			<Descriptions.Item label={<em>Cluster Name</em>}>{data.hostinfo ? data.hostinfo.cluster : proc.cluster ? proc.cluster : 'Unknown'}</Descriptions.Item>
			<Descriptions.Item label={<em>Process Gyeeta ID</em>}><span style={{ fontSize: 12 }}>{procid}</span></Descriptions.Item>
			<Descriptions.Item label={<em>Process cmdline </em>} span={3}>{proc.cmdline}</Descriptions.Item>
			<Descriptions.Item label={<em>Process Start Time</em>}>{proc.tstart}</Descriptions.Item>
			<Descriptions.Item label={<em>Region Name</em>}>{proc.region}</Descriptions.Item>
			<Descriptions.Item label={<em>Zone Name</em>}>{proc.zone}</Descriptions.Item>
			{proc.tag.length && <Descriptions.Item label={<em>Process Tags </em>}>{proc.tag}</Descriptions.Item>}
			<Descriptions.Item label={<em># Processes</em>}>{proc.nproc}</Descriptions.Item>
			<Descriptions.Item label={<em># Threads</em>}>{format(",")(proc.nthr)}</Descriptions.Item>
			<Descriptions.Item label={<em>Process Real Userid</em>}>{proc.uid}</Descriptions.Item>
			<Descriptions.Item label={<em>Process Real Groupid</em>}>{proc.gid}</Descriptions.Item>
			<Descriptions.Item label={<em>Privileged Process</em>}>{proc.hicap ? "Yes" : "No"}</Descriptions.Item>
			<Descriptions.Item label={<em>Process within a Container</em>}>{proc.conproc ? "Yes" : "No"}</Descriptions.Item>
			<Descriptions.Item label={<em>Realtime Process</em>}>{proc.rtproc ? "Yes" : "No"}</Descriptions.Item>
			<Descriptions.Item label={<em>CPU Throttled Process</em>}>{proc.cputhr ? "Yes" : "No"}</Descriptions.Item>
			{proc.cputhr && <Descriptions.Item label={<em>cgroup CPU Limited to</em>}>{proc.cgcpulimpct} %</Descriptions.Item>}
			{proc.maxcore && <Descriptions.Item label={<em>Max CPU cores allowed</em>}>{proc.maxcore}</Descriptions.Item>}
			<Descriptions.Item label={<em>Memory Limited Process</em>}>{proc.memlim ? "Yes" : "No"}</Descriptions.Item>
			<Descriptions.Item label={<em>cgroup Memory Util %</em>}>{proc.cgrsspct} %</Descriptions.Item>
			<Descriptions.Item label={<em>Current p95 CPU</em>}>{proc.p95cpupct} %</Descriptions.Item>
			<Descriptions.Item label={<em>p95 CPU Delay</em>}>{format(",")(proc.p95cpudel)} msec</Descriptions.Item>
			<Descriptions.Item label={<em>p95 Blkio Delay</em>}>{format(",")(proc.p95iodel)} msec</Descriptions.Item>
			<Descriptions.Item label={<em>Process is a Service</em>}>{issvc ? "Yes" : "No"}</Descriptions.Item>

			<Descriptions.Item label={<em>Complete Record</em>}>{ButtonJSONDescribe({record : proc, fieldCols : procinfofields})}</Descriptions.Item>

			</Descriptions>

			<div style={{ marginTop: 36, marginBottom: 16 }} >
			<Space>
			{getProcTimeState()}
			{getProcMonitor()}
			{<Button type='dashed' onClick={getHostInfo} >Process Host Information</Button>}
			{getNetFlows()}
			{issvc && <Button type='dashed' onClick={getProcSvc} >Process '{proc.name}' Services</Button>}
			</Space>
			</div>

			</>
			);
		}
		else {
			hinfo = (
				<>
				<Space>
				<Alert type="warning" showIcon message="Invalid or No Valid data found on server. Process Info may have been deleted." />
				{getProcTimeState()}
				</Space>
				</>
				);

			console.log(`Process Info Data Invalid seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		
		console.log(`Process Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
	}	
	else {
		hinfo = <LoadingAlert />;
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);
}

export function AggrProcModalCard({rec, parid, aggrMin, endtime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	if (!rec) {
		throw new Error(`No Data record specified for Aggr Process Modal`);
	}

	const			isaggr = (rec.inrecs !== undefined) ;

	if (isaggr && aggrMin === undefined) {
		aggrMin = 1;
	}	

	const			tstart = moment(rec.time, moment.ISO_8601).subtract(5, 'minute').format();
	const 			tend = getMinEndtime(rec.time, aggrMin ?? 1, endtime);

	const getProcInfo = () => {
		Modal.info({
			title : <span><strong>Process {rec.name} Info</strong></span>,
			content : <ProcInfoDesc procid={rec.procid} parid={parid ?? rec.parid} starttime={rec.time} endtime={tend} isTabletOrMobile={isTabletOrMobile}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Host of Process {rec.name} Info</strong></span>,
			content : <HostInfoDesc parid={parid ?? rec.parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getProcTimeState = () => {
		const		tabKey = `ProcState_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Process Performance around record time</i></span>, 'Process State as per time',
				() => { return <ProcMonitor procid={rec.procid} parid={parid} isRealTime={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};

	const getProcHistoricalState = useCallback((date, dateString, useAggr, dateAggrMin, aggrType) => {
		if (!date || !dateString) {
			return;
		}

		let		istimepoint = true;

		if (safetypeof(date) === 'array') {
			if (date.length !== 2 || safetypeof(dateString) !== 'array' || false === date[0].isValid() || false === date[1].isValid()) {
				message.error(`Invalid Historical Date Range set...`);
				return;
			}	

			istimepoint = false;
		}
		else {
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				message.error(`Invalid Historical Date set ${dateString}...`);
				return;
			}	
		}

		const		tabKey = `ProcHist_${Date.now()}`;
		
		CreateTab('Process Historical',
			() => { return <ProcMonitor procid={rec.procid} parid={parid} isRealTime={false} 
					starttime={istimepoint ? dateString : dateString[0]} endtime={istimepoint ? undefined : dateString[1]} 
					aggregatesec={!istimepoint && useAggr && dateAggrMin ? dateAggrMin * 60 : undefined}
					aggregatetype={!istimepoint && useAggr ? aggrType : undefined}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
					isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);

	}, [rec, parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);


	const getProcMonitor = () => {
		const		tabKey = `ProcMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Process Realtime Monitor</i></span>, 'Process Realtime Monitor', 
					() => { return <ProcMonitor procid={rec.procid} parid={parid} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getNetFlows = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Process Network Flows</i></span>, 'Network Flows', 
					() => { return <NetDashboard procid={rec.procid} procname={rec.name} parid={parid} autoRefresh={false} refreshSec={30} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getProcSvc = () => {
		Modal.info({
			title : <span><strong>Services of Process {rec.name}</strong></span>,
			content : <ProcSvcInfo procid={rec.procid} procname={rec.name} parid={parid} isTabletOrMobile={isTabletOrMobile} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const viewProcFields = (key, value, rec) => {
		if (key === 'state') {
			return StateBadge(value, value);
		}	
		else if (key === 'issue') {
			value = ProcIssueSource[value] ? ProcIssueSource[value].name : '';
		}	
		else if (key === 'desc') {
			return <span style={{ color : isStateIssue(rec.state) ? 'red' : undefined }} >{value}</span>;
		}	
		else if (typeof value === 'object' || typeof value === 'boolean') {
			value = JSON.stringify(value);
		}	

		return <span>{value}</span>;
	};

	return (
		<>
		<ErrorBoundary>

		<div style={{ overflowX : 'auto', overflowWrap : 'anywhere', margin: 30, padding: 10, border: '1px groove #d9d9d9', maxHeight : 500 }} >
		<JSONDescription jsondata={rec} titlestr={`${isaggr ? 'Aggregated' : '' } Process State for '${rec.name}'`} column={2} 
					fieldCols={[...procstatefields, ...aggrprocstatefields, ...extprocfields, ...hostfields]} xfrmDataCB={viewProcFields}  />
		</div>			
		
		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={rec.parid ? 8 : 24}> <Button type='dashed' onClick={getProcInfo} >Get Process '{rec.name}' Info</Button> </Col>
		{rec.parid && <Col span={8}> <Button type='dashed' onClick={getHostInfo} >Get Host '{rec.host}' Information</Button> </Col>}

		</Row>


		<Row justify="space-between">

		<Col span={8}> {getProcTimeState()} </Col>
		<Col span={8}> {getProcMonitor()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> 
		<TimeRangeAggrModal onChange={getProcHistoricalState} title={`Get '${rec.name}' Historical Process States`} 
					showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />

		</Col>			
		
		</Row>

		<Row justify="space-between">

		<Col span={8}> <Button type='dashed' onClick={getProcSvc} >Get Process '{rec.name}' Services</Button> </Col>
		<Col span={8}> {getNetFlows()} </Col>

		</Row>

		</Space>
		</div>

		</ErrorBoundary>

		</>
	);	
}

function ExtProcDesc({rec})
{
	if (safetypeof(rec) !== 'object') {
		return null;
	}	

	return (
		<>
		<ErrorBoundary>

		<Descriptions style={{ textAlign: 'center' }}>
		
		{rec.cmdline && <Descriptions.Item label={<em>Process Command Line</em>}>{rec.cmdline}</Descriptions.Item>}
		{rec.region && <Descriptions.Item label={<em>Region Name</em>}>{rec.region}</Descriptions.Item>}
		{rec.zone && <Descriptions.Item label={<em>Zone Name</em>}>{rec.zone}</Descriptions.Item>}
		{rec.tag && <Descriptions.Item label={<em>Process Tag Name</em>}>{rec.tag}</Descriptions.Item>}
		{rec.uid !== undefined && <Descriptions.Item label={<em>User ID Number</em>}>{rec.uid}</Descriptions.Item>}
		{rec.gid !== undefined && <Descriptions.Item label={<em>Group ID Number</em>}>{rec.gid}</Descriptions.Item>}
		{rec.cputhr !== undefined && <Descriptions.Item label={<em>CPU Throttled Process</em>}>{rec.cputhr ? "Yes" : "No"}</Descriptions.Item>}
		{rec.cputhr && <Descriptions.Item label={<em>cgroup CPU Limited to</em>}>{rec.cgcpulimpct} %</Descriptions.Item>}
		{rec.memlim !== undefined && <Descriptions.Item label={<em>Memory Limited Process</em>}>{rec.memlim ? "Yes" : "No"}</Descriptions.Item>}
		{rec.tstart && <Descriptions.Item label={<em>Process Start Time</em>}>{rec.tstart}</Descriptions.Item>}
		{rec.relsvcid && <Descriptions.Item label={<em>Process is a Service</em>}>{rec.relsvcid !== NullID ? "Yes" : "No"}</Descriptions.Item>}
		{rec.p95cpupct !== undefined && <Descriptions.Item label={<em>p95 CPU Utilization</em>}>{rec.p95cpupct} %</Descriptions.Item>}
		{rec.p95cpudel !== undefined && <Descriptions.Item label={<em>p95 CPU Delay</em>}>{format(",")(rec.p95cpudel)} msec</Descriptions.Item>}
		{rec.p95iodel !== undefined && <Descriptions.Item label={<em>p95 Block IO Delay</em>}>{format(",")(rec.p95iodel)} msec</Descriptions.Item>}
		{rec.cgrsspct !== undefined && <Descriptions.Item label={<em>cgroup Memory Util %</em>}>{rec.cgrsspct} %</Descriptions.Item>}

		</Descriptions>

		</ErrorBoundary>
		</>
	);
}


export function ProcStateSearch({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, isext, tabKey,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	const			[isrange, setisrange] = useState(false);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		let			mstart, mend;
		const			field = isext ? "extprocstate" : "procstate";

		if (starttime || endtime) {
			mstart = moment(starttime, moment.ISO_8601);

			if (endtime) {
				mend = moment(endtime, moment.ISO_8601);

				if (mend.unix() >= mstart.unix()  + 10) {
					setisrange(true);
				}	
			}	
		}
	
		const conf = 
		{
			url 	: isext ? NodeApis.extprocstate : NodeApis.procstate,
			method	: 'post',
			data : {
				starttime,
				endtime,
				parid,
				madfilterarr,
				timeoutsec 	: useAggr ? 500 : 100,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType ?? 'avg',
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
					recoffset       : recoffset > 0 ? recoffset : undefined,
				},	
			},
			timeout 	: useAggr ? 500 * 1000 : 100 * 1000,
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, field);
		};	


		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		}
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Process State", 
					description : `Exception occured while waiting for Process State data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Process Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, aggrMin, aggrType, doFetch, endtime, madfilterarr, filter, aggrfilter, maxrecs, starttime, useAggr, isext, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					const			field = isext ? "extprocstate" : "procstate";
					
					dataRowsCb(data[field]?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, isext, dataRowsCb]);	


	if (isloading === false && isapierror === false) { 
		const			field = isext ? "extprocstate" : "procstate";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Grouped Process {record.name}</strong></span>,
									content : (
										<>
										<AggrProcModalCard rec={record} parid={parid ?? record.parid} aggrMin={useAggr && aggrMin ? aggrMin : undefined}
												endtime={endtime} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
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
				}
				else {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Service {record.name} State</strong></span>,
									content : (
										<>
										<JSONDescription jsondata={record} />
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
				}	
			}

			let		columns, rowKey, newtitlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
				newtitlestr = "Process State";
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}
			else if (!isrange) {
				columns = parid ? hostAggrCol : globAggrCol;
				rowKey = "procid";

				if (parid) {
					newtitlestr = `Process State for Host ${hostname ?? ''}`;
				}	
				else {
					if (!name) {
						newtitlestr = 'Global Process State';
					}
					else {
						newtitlestr = `${name} Processs State`;
					}	
				}	

				timestr = <span style={{ fontSize : 14 }} ><strong> at {starttime ?? moment().format("MMM Do YYYY HH:mm:ss Z")} </strong></span>;
			}
			else {
				rowKey = ((record) => record.rowid ?? record.procid + record.time);

				if (parid) {
					newtitlestr = `${useAggr ? 'Aggregated ' : ''} Process State for Host ${hostname ?? ''}`;
					columns = !useAggr ? hostAggrRangeCol : aggrHostAggrCol(aggrType);
				}
				else {
					columns = !useAggr ? globAggrRangeCol : globAggrGlobAggrCol(aggrType);
					newtitlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : 'Global'} Process State`;
				}	
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;
			}	

			if (isext && !customColumns) {
				columns = getFixedColumns([...columns, ...extprocColumns]);
			}	

			const 			expandedRowRender = (rec) => <ExtProcDesc rec={rec} />;

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr ?? newtitlestr}</Title>
				{timestr}
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data[field]} 
					expandable={isext && !customTableColumns ? { expandedRowRender } : undefined} rowKey={rowKey} scroll={getTableScroll()} />
				</div>
				</>
			);

		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

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

export function procTableTab({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, isext, modal, title, 
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Process State Query", description : `Invalid starttime specified for Process State : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Process State Query", description : `Invalid endtime specified for Process State : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Process State Query", description : `Invalid endtime specified for Process State : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? ProcStateSearch;
	let				tabKey;

	const getComp = () => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						isext={isext} tabKey={tabKey} hostname={hostname} customColumns={customColumns} customTableColumns={customTableColumns}
						madfilterarr={madfilterarr} titlestr={titlestr}
						sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={ProcStateSearch} /> 
					</>	
				);
			};

	if (!modal) {
		tabKey = `ProcState_${Date.now()}`;

		CreateTab(title ?? "Process State", tabKey, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Process State",

			content : getComp(),
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Close',
			okType : 'default',
		});	
	}	
}	

export function ProcinfoSearch({parid, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.procinfo,
			method	: 'post',
			data : {
				starttime,
				endtime,
				parid,
				madfilterarr,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType ?? 'avg',
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
					recoffset       : recoffset > 0 ? recoffset : undefined,
				},	
			},
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, "procinfo");
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Process Info", 
				description : `Exception occured while waiting for Process Info data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Process Info fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, aggrMin, aggrType, doFetch, endtime, madfilterarr, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					dataRowsCb(data.procinfo?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, dataRowsCb]);	

	if (isloading === false && isapierror === false) { 
		const			field = "procinfo";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								const 			tend = getMinEndtime(record.time, aggrMin ?? 1, endtime);
								
								Modal.info({
									title : <span><strong>Process {record.name} Info</strong></span>,
									content : <ProcInfoDesc procid={record.procid} parid={record.parid ?? parid} procInfoObj={record} starttime={record.time} 
											endtime={tend} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,

									width : '90%',	
									closable : true,
									destroyOnClose : true,
									maskClosable : true,
								});
							}
						};		
					};
				}
				else {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Process {record.name} Info</strong></span>,
									content : (
										<>
										<JSONDescription jsondata={record} />
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
				}	

			}	

			let		columns, rowKey, newtitlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
				newtitlestr = "Process Info";
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}
			else if (parid) {
				columns = getProcinfoColumns(true, false);
				rowKey = "time";

				newtitlestr = 'Processs Info';

				timestr = <span style={{ fontSize : 14 }} ><strong> at {starttime ?? moment().format("MMM Do YYYY HH:mm:ss Z")} </strong></span>;
			}
			else {
				rowKey = ((record) => record.rowid ?? (record.time + record.parid ? record.parid : ''));
				columns = getProcinfoColumns(true, true);

				newtitlestr = `${useAggr ? 'Aggregated ' : ''} Process Info `;
			
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;
			}	

			if (name) {
				newtitlestr += ` for ${name}`;
			}	

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr ?? newtitlestr}</Title>
				{timestr}
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.procinfo} rowKey={rowKey} scroll={getTableScroll()} />
				</div>
				</>
			);

		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

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

export function procInfoTab({parid, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Process Info Query", description : `Invalid starttime specified for Process Info : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Process Info Query", description : `Invalid endtime specified for Process Info : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Process Info Query", description : `Invalid endtime specified for Process Info : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? ProcinfoSearch;
	let				tabKey;

	const getComp = () => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} 
						madfilterarr={madfilterarr} titlestr={titlestr} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={ProcinfoSearch} /> 
					</>
				);
			};

	if (!modal) {
		tabKey = `Procinfo_${Date.now()}`;

		CreateTab(title ?? "Process Info", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Process Info",

			content : getComp(),
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Close',
			okType : 'default',
		});	
	}	
}

export function ProcDashboard({parid, autoRefresh, refreshSec, starttime, endtime, filter, name, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile})
{
	const 		objref = useRef(null);

	const 		[fetchIntervalmsec, ] = useState(autoRefresh && refreshSec >= 5 ? refreshSec * 1000 : procfetchsec * 1000);
	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[, setTimeSlider] = useState();
	const		[, setPauseRefresh] = useState();
	const		[isPauseRefresh, pauseRefresh] = useState(false);

	if (objref.current === null) {
		console.log(`Proc Dashboard initializing ...`);

		objref.current = {
			isrange 		: (typeof starttime === 'string' && typeof endtime === 'string'),
			nextfetchtime		: Date.now(),
			nerrorretries		: 0,
			hostname		: '',
			prevdata		: null,
			pauseRefresh		: false,
			isPauseRefresh		: false,
			modalCount		: 0,
			isstarted		: false,
			timeSliderIndex		: null,
			sliderTimer		: null,
			datahistarr		: [],
		};	
	}

	useEffect(() => {
		console.log(`Proc Dashboard initial Effect called...`);

		return () => {
			console.log(`Proc Dashboard destructor called...`);
		};	
	}, []);

	const validProps = useMemo(() => {	

		if (starttime || endtime) {
			let		mstart = moment(starttime, moment.ISO_8601), mend;

			if (false === mstart.isValid()) {
				throw new Error(`Invalid starttime specified : ${starttime}`);
			}	

			if (endtime) {
				mend = moment(endtime, moment.ISO_8601);

				if (false === mend.isValid()) {
					throw new Error(`Invalid endtime specified : ${endtime}`);
				}
				else if (mend.unix() < mstart.unix()) {
					throw new Error(`Invalid endtime specified : endtime less than starttime : ${endtime}`);
				}	

				if (mend.unix() >= mstart.unix() + 2 * procfetchsec) {
					objref.current.isrange = true;
				}
			}	

		}
		else if (!autoRefresh && !starttime) {
			throw new Error(`autoRefresh disabled but no starttime specified`);
		}	

		if (filter && ((false === filter.includes('host')) && (false === filter.includes('cluster')) && (false === filter.includes('parid')))) {
			throw new Error(`Invalid filter prop specified : Only Host Filters allowed`);
		}

		if (addTabCB && typeof addTabCB !== 'function') {
			throw new Error(`Invalid addTabCB prop specified`);
		}	

		if (remTabCB && typeof remTabCB !== 'function') {
			throw new Error(`Invalid remTabCB prop specified`);
		}	

		if (isActiveTabCB && ((typeof isActiveTabCB !== 'function') || (typeof tabKey !== 'string'))) {
			throw new Error(`Invalid tab properties specified`);	
		}	
		
		return true;

	}, [objref, starttime, endtime, filter, autoRefresh, addTabCB, remTabCB, isActiveTabCB, tabKey]);	

	if (validProps === false) {
		throw new Error(`Internal Error : Process Dashboard validProps check failed`);
	}	

	useEffect(() => {
		console.log(`isPauseRefresh Changes seen : isPauseRefresh = ${isPauseRefresh}`);

		objref.current.isPauseRefresh = isPauseRefresh;
		objref.current.pauseRefresh = isPauseRefresh;
	}, [isPauseRefresh, objref]);

	const modalCount = useCallback((isup) => {
		if (isup === true) {
			objref.current.modalCount++;
		}	
		else if (isup === false && objref.current.modalCount > 0) {
			objref.current.modalCount--;
		}	
	}, [objref]);	

	const tableOnAggrRow = useCallback((record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Grouped Process {record.name}</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						<AggrProcModalCard rec={record} parid={parid ?? record.parid} isTabletOrMobile={isTabletOrMobile} 
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
						</>
						),

					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
				});
			}
		};		
	}, [addTabCB, remTabCB, isActiveTabCB, parid, isTabletOrMobile, modalCount]);	
	
	/*
	// TODO
	const tableOnHostRow = useCallback((record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Process {record.name}</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						<Skeleton loading={true} active><span>Loading...</span></Skeleton>
						</>
						),

					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
				});
			}
		};		
	}, [modalCount]);	
	*/

	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 30) => {

		const conf = {
			url 		: NodeApis.multiquery, 
			method 		: 'post', 
			data 		: { 
				parid 		: parid,
				timeoutsec 	: timeoutsec,
				multiqueryarr	: [
					{
						qid 		: 'topaggr', 
						qname 		: 'topAggrProcs',
						options 	: { 
							send_topissue 		: true, 
							send_topcpu 		: true, 
							send_toprss 		: true, 
							send_topcpudelay 	: true, 
							send_topvmdelay		: true, 
							send_topiodelay		: true, 
							send_topnet 		: true,
							filter			: filter,

							...fetchparams,
						},	
					},
				],
			}, 
			timeout 	: timeoutsec * 1000,
		};

		if (parid) {
			conf.data.multiqueryarr.push(
							{
								qid 		: 'tophost', 
								qname 		: 'topHostProcs',
								options 	: { 
									send_topcpu 	: true,
									send_toppgcpu 	: true,
									send_toprss 	: true,
									send_topfork 	: true,
									filter		: filter,
								},	
							}
						);
		}			

		return conf;

	}, [parid, filter]);

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		conf, currtime = Date.now();
				const		oldpause = objref.current.pauseRefresh;

				if (isActiveTabCB && tabKey) {
					objref.current.pauseRefresh = !isActiveTabCB(tabKey);
				}

				if (objref.current.timeSliderIndex !== null) {
					objref.current.pauseRefresh = true;
				}	

				if (objref.current.modalCount > 0) {
					objref.current.pauseRefresh = true;
				}	

				if (objref.current.isPauseRefresh === true) {
					objref.current.pauseRefresh = true;
				}	

				if (true === objref.current.pauseRefresh || currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted)) {
					if (oldpause === false && objref.current.pauseRefresh) {
						setPauseRefresh(true);
					}	

					return;
				}

				conf = getaxiosconf();

				if (!autoRefresh) {
					conf.data.starttime = starttime;

					if (objref.current.isrange) {
						conf.data.endtime = endtime;
					}
				}

				console.log(`Fetching Process Dashboard for config ${JSON.stringify(conf)}`);

				setApiData({data : [], isloading : true, isapierror : false});

				let 		res = await axios(conf);

				if (autoRefresh === true) {
					objref.current.nextfetchtime = Date.now() + fetchIntervalmsec;
				}
				else {
					objref.current.nextfetchtime = 0;
				}	

				validateApi(res.data);

				if (safetypeof(res.data) === 'array') { 
					const		ndata = norm_top_processes(res.data, !autoRefresh ? starttime : undefined);

					setApiData({data : ndata, isloading : false, isapierror : false});
				
					fixedArrayAddItems(ndata, objref.current.datahistarr, 10);

					objref.current.nerrorretries = 0
					objref.current.isstarted = true;

					if (parid && ndata[0].topaggr?.hostinfo?.host) {
						objref.current.hostname = ndata[0].topaggr.hostinfo.host;
					}	
				}
				else {
					setApiData({data : [], isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Data fetch... Will retry a few times later."});

					if (objref.current.nerrorretries < 5) {
						objref.current.nerrorretries++;
						objref.current.nextfetchtime = Date.now() + 10000;
					}	
					else {
						objref.current.nextfetchtime = Date.now() + 60000;
					}	
				}	

			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});

				if (e.response && (e.response.status === 401)) {
					notification.error({message : "Authentication Failure", 
						description : `Authentication Error occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				}
				else {
					notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
				}

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				if (objref.current.nerrorretries < 5) {
					objref.current.nerrorretries++;
					objref.current.nextfetchtime = Date.now() + 10000;
				}
				else {
					objref.current.nextfetchtime = Date.now() + 60000;
				}	
			}	
			finally {
				timer1 = setTimeout(apiCall, 1000);
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for Process interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, getaxiosconf, parid, autoRefresh, fetchIntervalmsec, starttime, endtime, isActiveTabCB, tabKey]);	
	
	const onTimeSliderChange = useCallback((newindex) => {
		if (objref && objref.current && objref.current.datahistarr.length > newindex && objref.current.datahistarr[newindex]) {
			setApiData({data : [objref.current.datahistarr[newindex]], isloading : false, isapierror : false});
			objref.current.timeSliderIndex = newindex;
		}
	}, [objref]);

	const onTimeSliderAfterChange = useCallback(() => {
		if (objref && objref.current) {
			if (objref.current.sliderTimer) {
				clearTimeout(objref.current.sliderTimer);
			}

			objref.current.sliderTimer = setTimeout(() => {
				setTimeSlider(null);
				objref.current.timeSliderIndex = null;
			}, 15000);
		}
	}, [objref]);

	const getTimeSliderMarks = useCallback(() => {
		let		markobj = {};

		if (objref && objref.current && objref.current.datahistarr.length) {
			const			datahistarr = objref.current.datahistarr;

			for (let i = 0;  i < datahistarr.length; ++i) {
				if (datahistarr[i] && datahistarr[i].rectime) {
					markobj[i] = moment(datahistarr[i].rectime, moment.ISO_8601).format("HH:mm:ss");
				}
			}	
		}

		return markobj;

	}, [objref]);	

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
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				message.error(`Invalid Historical Date set ${dateString}...`);
				return;
			}	

			tstarttime = dateString;
		}

		const			tabKey = `ProcDashboard_${Date.now()}`;
		
		CreateTab(parid ? 'Host Processes' : 'Process Dashboard', 
			() => { return <ProcDashboard parid={parid} autoRefresh={false} starttime={tstarttime} endtime={tendtime}  filter={filter} name={name}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [parid, filter, name, addTabCB, remTabCB, isActiveTabCB]);	

	const onNewAutoRefresh = useCallback(() => {
		const			tabKey = (parid || filter) ? `ProcDashboard_${Date.now()}` : procDashKey;
		
		CreateTab(parid ? 'Host Processes' : filter ? 'Process Dashboard' : 'Global Processes', 
			() => { return <ProcDashboard parid={parid} autoRefresh={true}  filter={filter} name={name}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [parid, filter, name, addTabCB, remTabCB, isActiveTabCB]);	

	const onStateSearch = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs, aggrfilter) => {
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

		// Check filters
		let		fstr;

		if (filter) {
			if (newfilter) {
				fstr = `( ${filter} and ${newfilter} )`; 
			}	
			else {
				fstr = filter;
			}	
		}	
		else {
			fstr = newfilter;
		}	

		// Now close the search modal
		Modal.destroyAll();

		procTableTab({parid, hostname : parid ? objref.current.hostname : undefined, starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, 
					filter : fstr, aggrfilter, name, maxrecs, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});

	}, [parid, filter, name, addTabCB, remTabCB, isActiveTabCB, objref]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range'
				initStart={true} showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <ProcStateMultiQuickFilter filterCB={onfiltercb} useHostFields={!parid} showquickfilter={!!parid} isext={true} />;
	}, [parid]);	

	const aggrfiltercb = useCallback((onfiltercb) => {
		return <ProcStateAggrFilter filterCB={onfiltercb} isext={true} />;
	}, []);	

	
	const procinfocb = (filt) => {
		let			newfil;

		if (filter && filt) {
			newfil = `(${filter} and ${filt})`;
		}
		else if (filter) newfil = filter;
		else newfil = filt;

		procInfoTab(
		{
			starttime 		: starttime ? moment(starttime, moment.ISO_8601).subtract(1, 'minute').format() : moment().subtract(10, 'minute').format(),
			endtime 		: endtime ?? moment().format(),
			parid			: parid,
			useAggr			: true, 
			aggrMin			: starttime && endtime ? (moment(endtime, moment.ISO_8601).unix() - moment(starttime, moment.ISO_8601).unix())/60 + 60 : 60,
			aggrType		: 'avg',
			filter 			: newfil, 
			maxrecs			: 20000,
			name			: name ?? (parid ? `Host ${objref.current.hostname}` : undefined),
			addTabCB, 
			remTabCB, 
			isActiveTabCB,
			wrapComp 		: SearchWrapConfig,
		});
	};

	const optionDiv = (width) => {
		const		searchtitle = `Search ${parid ? 'Host' : name ? name : 'Global'} Process States`;
		const		infotitle = `Get Info for all ${parid ? 'Host' : name ? name : 'Global'} Processes`;

		return (
			<div style={{ marginLeft: 30, marginRight: 30, marginBottom : 30,  width: width, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', 
						border : '1px groove #7a7aa0', padding : 10 }} >

			<div>
			<Space>

			<ButtonModal buttontext={searchtitle} width={800}  okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onStateSearch} title={searchtitle} 
						timecompcb={timecb} filtercompcb={filtercb} aggrfiltercb={aggrfiltercb}
						rangefiltermandatory={parid === undefined} ismaxrecs={true} defaultmaxrecs={50000} />
				)} />
					

			<Button onClick={() => (
				Modal.confirm({
					title : <span style={{ fontSize : 16 }} ><strong>Apply Optional Process Info Filters</strong></span>,

					content : <MultiFilters filterCB={procinfocb} filterfields={procinfofields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Process Info List',
					onOk : () => procinfocb(),
					okType : 'primary',
					cancelType : 'primary',
				})	

				)}>{infotitle}</Button>
			
			</Space>

			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>
			{autoRefresh && isPauseRefresh === false && (<Button onClick={() => {pauseRefresh(true)}}>Pause Auto Refresh</Button>)}
			{autoRefresh && isPauseRefresh === true && (<Button onClick={() => {objref.current.nextfetchtime = Date.now() + 1000; pauseRefresh(false)}}>Resume Auto Refresh</Button>)}

			{!autoRefresh && (<Button onClick={() => {onNewAutoRefresh()}}>Auto Refreshed Dashboard</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title={`Historical Process Dashboard ${objref.current.filterset ? 'with filters' : ''}`} 
					showTime={true} showRange={parid !== undefined} minAggrRangeMin={0} maxAggrRangeMin={0} disableFuture={true} />
			</Space>
			</div>

			</div>
		);
	};	

	let			hdrtag = null, bodycont = null;

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && (safetypeof(normdata[0].topaggr) === 'object') && safetypeof(normdata[0].topaggr.topissue) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		const		topaggr = normdata[0].topaggr;
		const		tophost = normdata[0].tophost;
		const		rectime = normdata[0].rectime;

		let		timestr = null;
		
		if (objref.current.isrange && !autoRefresh) {
			timestr = <span style={{ fontSize : 14 }} > for time range between <i>{starttime}</i> and <i>{endtime}</i> </span>;
		}	
		else if (rectime) {
			timestr = <span style={{ fontSize : 14 }} > at {rectime} ({moment(rectime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss.SSS Z")}) </span>;
		}	

		return (
			<>
				{alertdata}

				{optionDiv()}

				{autoRefresh && (
					<>
					<h4 style={{ textAlign : 'center' }} ><em><strong>Recent Time History Slider</strong></em></h4>
					<div style={{ marginLeft : 60, marginRight : 60, marginBottom : 50 }} >
					<Slider marks={getTimeSliderMarks()} min={0} max={objref.current.datahistarr.length} 
						onChange={onTimeSliderChange} onAfterChange={onTimeSliderAfterChange} tooltipVisible={false} />
					</div>	
					</>	
					)	
				}

				<div style={{ textAlign : 'center', marginTop: 30, marginBottom: 15 }}>

				<Title level={4}>{parid ? `Host '${topaggr.hostinfo?.host}'` : name ? name : "Global"} Grouped Top Process Dashboards</Title>
				{timestr}
				

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} Grouped Processes with Issues</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostAggrCol : globAggrCol) : hostAggrRangeCol} dataSource={topaggr.topissue} onRow={tableOnAggrRow} 
						rowKey={!objref.current.isrange ? "procid" : ((record) => record.procid + record.time)} 
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} CPU Grouped Processes</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostAggrCol : globAggrCol) : hostAggrRangeCol} dataSource={topaggr.topcpu} onRow={tableOnAggrRow} 
						rowKey={!objref.current.isrange ? "procid" : ((record) => record.procid + record.time)} 
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} Resident Memory (RSS) Grouped Processes </Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostAggrCol : globAggrCol) : hostAggrRangeCol} dataSource={topaggr.toprss} onRow={tableOnAggrRow} 
						rowKey={!objref.current.isrange ? "procid" : ((record) => record.procid + record.time)} 
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} Grouped Processes with CPU Delays</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostAggrCol : globAggrCol) : hostAggrRangeCol} dataSource={topaggr.topcpudelay} onRow={tableOnAggrRow} 
						rowKey={!objref.current.isrange ? "procid" : ((record) => record.procid + record.time)} 
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} Grouped Processes with Memory Delays</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostAggrCol : globAggrCol) : hostAggrRangeCol} dataSource={topaggr.topvmdelay} onRow={tableOnAggrRow} 
						rowKey={!objref.current.isrange ? "procid" : ((record) => record.procid + record.time)} 
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} Grouped Processes with Block IO Delays</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostAggrCol : globAggrCol) : hostAggrRangeCol} dataSource={topaggr.topiodelay} onRow={tableOnAggrRow} 
						rowKey={!objref.current.isrange ? "procid" : ((record) => record.procid + record.time)} 
						scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} Network Traffic Grouped Processes </Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostAggrCol : globAggrCol) : hostAggrRangeCol} dataSource={topaggr.topnet} onRow={tableOnAggrRow} 
						rowKey={!objref.current.isrange ? "procid" : ((record) => record.procid + record.time)} 
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>


				</div>

				{parid && tophost && (
					<div style={{ textAlign: 'center', marginTop: 35, marginBottom: 35  }}>

					<Title level={3}>Top Individual Process Dashboards</Title>
					
					<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
					<Title level={4}>Top CPU Processes</Title>
					<GyTable columns={!objref.current.isrange ? hostCpuRssCol : hostCpuRssRangeCol} dataSource={tophost.topcpu}
							rowKey={!objref.current.isrange ? "pid" : ((record) => record.pid + record.time)} 
							modalCount={modalCount} scroll={getTableScroll()} />
					</div>

					<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
					<Title level={4}>Top CPU Process Groups</Title>
					<GyTable columns={!objref.current.isrange ? hostPgCpuCol : hostPgCpuRangeCol} dataSource={tophost.toppgcpu}
							rowKey={!objref.current.isrange ? "pgpid" : ((record) => record.pgpid + record.time)} 
							modalCount={modalCount} scroll={getTableScroll()} />
					</div>

					<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
					<Title level={4}>Top Memory Resident Processes</Title>
					<GyTable columns={!objref.current.isrange ? hostCpuRssCol : hostCpuRssRangeCol} dataSource={tophost.toprss}
							rowKey={!objref.current.isrange ? "pid" : ((record) => record.pid + record.time)} 
							modalCount={modalCount} scroll={getTableScroll()} />
					</div>

					<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
					<Title level={4}>Top New Process creating Parent Processes</Title>
					<GyTable columns={!objref.current.isrange ? hostForkCol : hostForkRangeCol} dataSource={tophost.topfork}
							rowKey={!objref.current.isrange ? "pid" : ((record) => record.pid + record.time)} 
							modalCount={modalCount} scroll={getTableScroll()} />
					</div>


					</div>
				)}	

			</>
		);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && (safetypeof(data[0].topaggr) === 'object') && safetypeof(data[0].topaggr.topissue) === 'array') { 
			if (autoRefresh && false === objref.current.pauseRefresh) {
				hdrtag = <Tag color='green'>Running with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>;
			}
			else {
				hdrtag = <Tag color='blue'>Auto Refresh Paused</Tag>;
			}	

			bodycont = getContent(data, <Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);

			objref.current.prevdata = data;
		}
		else {
			hdrtag = (<Tag color='red'>Data Error</Tag>);

			let			emsg;

			if (objref.current.nerrorretries < 5) {
				objref.current.nerrorretries++;
				objref.current.nextfetchtime = Date.now() + 30000;

				emsg = "Invalid or no data seen. Will retry after a few seconds...";
			}
			else {
				objref.current.nextfetchtime = 0;

				emsg = "Invalid or no data seen. Too many retry errors...";
			}	

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message={emsg} description=<Empty /> />);

			console.log(`Process Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Process Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

			objref.current.nextfetchtime = Date.now() + 10000;
		}
		else if (isloading) {
			hdrtag = <Tag color='blue'>Loading Data</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="info" showIcon message="Loading Data..." />);
		}
		else {
			if (autoRefresh && false === objref.current.pauseRefresh && false === isPauseRefresh) {
				hdrtag = <Tag color='green'>Running with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>;
			}
			else if (autoRefresh) {
				hdrtag = (
					<>
					<Tag color='green'>Running with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>
					<Tag color='blue'>Auto Refresh Paused</Tag>
					</>);

			}	
			else {
				hdrtag = <Tag color='blue'>Auto Refresh Paused</Tag>;
			}	

			bodycont = getContent(objref.current.prevdata, <Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);
		}	
	}

	const		titlestr = parid ? `Host ${objref.current.hostname} Process Dashboard` :
					name ? `${name} Process Dashboard` : `Global Process Dashboard`;

	return (
		<>
		<Title level={4}><em>{titlestr}{ !name && filter ? ' with input filters' : ''}</em></Title>
		{hdrtag}

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);
}

