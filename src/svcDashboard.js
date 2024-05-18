
import 			React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import 			moment from 'moment';
import 			axios from 'axios';

import 			{Button, Space, Slider, Descriptions, Statistic, Modal, message, Typography, Empty, Tag, Alert, notification, Row, Col, Input} from 'antd';

import 			{format} from "d3-format";

import 			{FixedPrioQueue} from './components/fixedPrioQueue.js';
import 			{safetypeof, validateApi, fixedArrayAddItems, kbStrFormat, usecStrFormat, useFetchApi, CreateLinkTab, CreateTab, ComponentLife, 
			mergeMultiMadhava, ButtonModal, capitalFirstLetter, stateEnum, ButtonJSONDescribe, LoadingAlert, JSONDescription, strTruncateTo,
			getStateColor, getMinEndtime, msecStrFormat} from './components/util.js';
import 			{StateBadge} from './components/stateBadge.js';
import 			{HostInfoDesc} from './hostViewPage.js';
import 			{GyTable, getTableScroll, getFixedColumns} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{SvcMonitor, SvcIssueSource} from './svcMonitor.js';
import 			{NetDashboard} from './netDashboard.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';
import			{svcDashKey, svcGroupKey} from './gyeetaTabs.js';
import 			{MultiFilters, SearchTimeFilter, hostfields} from './multiFilters.js';
import			{SvcClusterGroups} from './svcClusterGroups.js';
import			{procInfoTab, procTableTab} from './procDashboard.js';

const 			{Title} = Typography;
const 			{Search} = Input;
const 			{ErrorBoundary} = Alert;

const 			maxtopelem = 100;
const			svcfetchsec = 15;

export const svcstatefields = [
	{ field : 'name',		desc : 'Service Name',			type : 'string',	subsys : 'svcstate',	valid : null, },
	{ field : 'qps5s',		desc : 'Queries/sec QPS',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nqry5s',		desc : '# Queries per 5 sec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'resp5s',		desc : 'Avg 5 sec Response ms',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'p95resp5s',		desc : 'p95 5 sec Response ms',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'p95resp5m',		desc : 'p95 5 min Response ms',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nactive',		desc : '# Active Connections',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nconns',		desc : '# Total Connections',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'kbin15s',		desc : 'Service Inbound Net KB',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'kbout15s',		desc : 'Service Outbound Net KB',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'sererr',		desc : '# Server Errors',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'clierr',		desc : '# Client Errors',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nprocs',		desc : '# Listener Processes',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'delayus',		desc : 'Process Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'cpudelus',		desc : 'CPU Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'iodelus',		desc : 'Block IO Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'vmdelus',		desc : 'Memory Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'usercpu',		desc : 'Process User CPU %',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'syscpu',		desc : 'Process System CPU %',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'rssmb',		desc : 'Process Memory RSS MB',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nissue',		desc : '# Processes with Issue',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'state',		desc : 'Service State',			type : 'enum',		subsys : 'svcstate',	valid : null, 		esrc : stateEnum },
	{ field : 'issue',		desc : 'Service Issue Cause',		type : 'enum',		subsys : 'svcstate',	valid : null, 		esrc : SvcIssueSource },
	{ field : 'ishttp',		desc : 'Is Web HTTP Service',		type : 'boolean',	subsys : 'svcstate',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'svcstate',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'svcstate',	valid : null, },
	{ field : 'desc',		desc : 'Service State Analysis',	type : 'string',	subsys : 'svcstate',	valid : null, },
];	

export const aggrsvcstatefields = [
	{ field : 'name',		desc : 'Service Name',			type : 'string',	subsys : 'svcstate',	valid : null, },
	{ field : 'qps5s',		desc : 'Queries/sec QPS',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nqry5s',		desc : 'Total Queries',			type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'resp5s',		desc : 'Avg Response ms',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'p95resp5s',		desc : 'p95 5 sec Response ms',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'p95resp5m',		desc : 'p95 5 min Response ms',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nactive',		desc : '# Active Connections',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nconns',		desc : '# Total Connections',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'kbin15s',		desc : 'Service Inbound Net KB',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'kbout15s',		desc : 'Service Outbound Net KB',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'sererr',		desc : '# Server Errors',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'clierr',		desc : '# Client Errors',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'nprocs',		desc : '# Listener Processes',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'delayus',		desc : 'Process Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'cpudelus',		desc : 'CPU Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'iodelus',		desc : 'Block IO Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'vmdelus',		desc : 'Memory Delays usec',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'usercpu',		desc : 'Process User CPU %',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'syscpu',		desc : 'Process System CPU %',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'rssmb',		desc : 'Process Memory RSS MB',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'ishttp',		desc : 'Is Web HTTP Service',		type : 'boolean',	subsys : 'svcstate',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'svcstate',	valid : null, },
	{ field : 'svcissue',		desc : 'Count of Service Issues',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inrecs',		desc : '# Records in Aggregation',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inproc',		desc : 'Degrades by Process Issues',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inqps',		desc : 'Degrades by High QPS',		type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inaconn',		desc : 'Degrades by High Active Conn',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inhttperr',		desc : 'Degrades by Server Errors',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inoscpu',		desc : 'Degrades by Host CPU Issues',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inosmem',		desc : 'Degrades by Host Memory Issues',type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'indepsvc',		desc : 'Degrades by Dependent Service',	type : 'number',	subsys : 'svcstate',	valid : null, },
	{ field : 'inunknown',		desc : 'Degrades by Unknown Issues',	type : 'number',	subsys : 'svcstate',	valid : null, },
];	

export const extsvcfields = [
	{ field : 'ip',			desc : 'Listener IP Address',	type : 'string',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'port',		desc : 'Listener Port',		type : 'number',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'tstart',		desc : 'Service Start Time',	type : 'timestamptz',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'cmdline',		desc : 'Process Command Line',	type : 'string',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'region',		desc : 'Region Name',		type : 'string',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'zone',		desc : 'Zone Name',		type : 'string',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'p95resp5d',		desc : 'p95 5 day Response ms',	type : 'number',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'avgresp5d',		desc : 'Avg 5 day Response ms',	type : 'number',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'p95qps',		desc : 'p95 Queries/sec',	type : 'number',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'p95aconn',		desc : 'p95 Active Connections',type : 'number',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'svcip1',		desc : 'Virtual IP Address 1',	type : 'string',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'svcport1',		desc : 'Virtual Port 1',	type : 'number',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'svcdns',		desc : 'Service Domain Name',	type : 'string',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'svctag',		desc : 'Service Tag Name',	type : 'string',	subsys : 'extsvcstate',	valid : null, },
	{ field : 'relsvcid',		desc : 'Service Relative ID',	type : 'string',	subsys : 'extsvcstate',	valid : null, },
];

export const svcinfofields = [
	{ field : 'name',		desc : 'Service Name',			type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'ip',			desc : 'Listener IP Address',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'port',		desc : 'Listener Port',			type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'tstart',		desc : 'Service Start Time',		type : 'timestamptz',	subsys : 'svcinfo',	valid : null, },
	{ field : 'cmdline',		desc : 'Process Command Line',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'region',		desc : 'Region Name',			type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'zone',		desc : 'Zone Name',			type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'p95resp5d',		desc : 'p95 5 day Response ms',		type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'avgresp5d',		desc : 'Avg 5 day Response ms',		type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'p95qps',		desc : 'p95 Queries/sec',		type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'p95aconn',		desc : 'p95 Active Connections',	type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svcip1',		desc : 'Virtual IP Address 1',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svcport1',		desc : 'Virtual Port 1',		type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svcip2',		desc : 'Virtual IP Address 2',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svcport2',		desc : 'Virtual Port 2',		type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svcdns',		desc : 'Service Domain Name',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svctag',		desc : 'Service Tag Name',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'nsvcmesh',		desc : 'Mesh Cluster Service Count',	type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'nip1svc',		desc : 'Virtual IP 1 Cluster Count',	type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'nip2svc',		desc : 'Virtual IP 2 Cluster Count',	type : 'number',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'relsvcid',		desc : 'Service Relative ID',		type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'svcmeshid',		desc : 'Mesh Cluster Service ID',	type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'ip1cluid',		desc : 'Virtual IP 1 Cluster ID',	type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'ip2cluid',		desc : 'Virtual IP 2 Cluster ID',	type : 'string',	subsys : 'svcinfo',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'svcinfo',	valid : null, },
];

export const svcsummfields = [
	{ field : 'nsevere',		desc : '# Services in Severe state',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'nbad',		desc : '# Services in Bad state',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'nok',		desc : '# Services in OK state',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'ngood',		desc : '# Services in Good state',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'nidle',		desc : '# Services in Idle state',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'totqps',		desc : 'Total Queries/sec',		type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'totaconn',		desc : 'Total Active Connections',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'totkbin',		desc : 'Total Network Inbound KB',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'totkbout',		desc : 'Total Network Outbound KB',	type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'totsererr',		desc : 'Total Server Errors',		type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'nsvc',		desc : '# Total Services',		type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'nactive',		desc : '# Active Services',		type : 'number',	subsys : 'svcsumm',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'svcsumm',	valid : null, },
];	

function norm_top_listeners(origdata)
{
	if (Array.isArray(origdata) !== true) {
		return origdata;
	}	
	
	if (origdata.length === 0) {
		return origdata;
	}	

	if (origdata.length === 1) {
		if ('array' === safetypeof(origdata[0].topissue)) {
			origdata[0].topissue.sort((lhs, rhs) => { return lhs.state === 'Severe' && rhs.state !== 'Severe' });
		}

		if ('array' === safetypeof(origdata[0].topqps)) {
			origdata[0].topqps.sort((lhs, rhs) => { return rhs.qps5s - lhs.qps5s });
		}

		if ('array' === safetypeof(origdata[0].topactconn)) {
			origdata[0].topactconn.sort((lhs, rhs) => { return rhs.nactive - lhs.nactive });
		}

		if ('array' === safetypeof(origdata[0].topnet)) {
			origdata[0].topnet.sort((lhs, rhs) => { return (rhs.kbin15s + rhs.kbout15s) - (lhs.kbin15s + lhs.kbout15s) });
		}
		return origdata;
	}	

	let		normdata = {};
	let		prioissue, prioqps, prioactconn, prionet, addsumm;

	if (origdata[0].topissue) {
		normdata.topissue 	= [];
		prioissue 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.state === 'Severe' && lhs.state !== 'Severe' });
	}	

	if (origdata[0].topqps) {
		normdata.topqps 	= [];
		prioqps 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.qps5s - lhs.qps5s });
	}	

	if (origdata[0].topactconn) {
		normdata.topactconn 	= [];
		prioactconn 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return rhs.nactive - lhs.nactive });
	}	

	if (origdata[0].topnet) {
		normdata.topnet 	= [];
		prionet 		= new FixedPrioQueue(maxtopelem, (lhs, rhs) => { return (rhs.kbin15s + rhs.kbout15s) - (lhs.kbin15s + lhs.kbout15s) });
	}	

	if (origdata[0].summstats) {
		normdata.summstats 	= {
			time		: '',
			nidle		: 0,
			ngood		: 0,
			nok		: 0,
			nbad		: 0,
			nsevere		: 0,
			ndown		: 0,
			totqps		: 0,
			totaconn	: 0,
			totsererr	: 0,
			totkbin		: 0,
			totkbout	: 0,
			nsvc		: 0,
			nactive		: 0,
		};
		addsumm 		= (norm, elem) => {
			norm.time	= elem.time;
			norm.nidle	+= elem.nidle;
			norm.ngood	+= elem.ngood;
			norm.nok	+= elem.nok;
			norm.nbad	+= elem.nbad;
			norm.nsevere	+= elem.nsevere;
			norm.ndown	+= elem.ndown;
			norm.totqps	+= elem.totqps;
			norm.totaconn	+= elem.totaconn;
			norm.totsererr	+= elem.totsererr;
			norm.totkbin	+= elem.totkbin;
			norm.totkbout	+= elem.totkbout;
			norm.nsvc	+= elem.nsvc;
			norm.nactive	+= elem.nactive;
		};	
	}	

	for (let madhava of origdata) {
		if (prioissue && madhava.topissue && Array.isArray(madhava.topissue)) {
			for (let i = 0; i < madhava.topissue.length; ++i) {
				prioissue.pushdata(madhava.topissue[i]);
			}	
		}	

		if (prioqps && madhava.topqps && Array.isArray(madhava.topqps)) {
			for (let i = 0; i < madhava.topqps.length; ++i) {
				prioqps.pushdata(madhava.topqps[i]);
			}	
		}

		if (prioactconn && madhava.topactconn && Array.isArray(madhava.topactconn)) {
			for (let i = 0; i < madhava.topactconn.length; ++i) {
				prioactconn.pushdata(madhava.topactconn[i]);
			}	
		}

		if (prionet && madhava.topnet && Array.isArray(madhava.topnet)) {
			for (let i = 0; i < madhava.topnet.length; ++i) {
				prionet.pushdata(madhava.topnet[i]);
			}	
		}

		if (normdata.summstats && madhava.summstats) {
			addsumm(normdata.summstats, madhava.summstats);
		}	
	}	

	if (prioissue && prioissue.size()) {
		prioissue.popsorted((data) => { normdata.topissue.push(data); });
	}	

	if (prioqps && prioqps.size()) {
		prioqps.popsorted((data) => { normdata.topqps.push(data); });
	}	

	if (prioactconn && prioactconn.size()) {
		prioactconn.popsorted((data) => { normdata.topactconn.push(data); });
	}	

	if (prionet && prionet.size()) {
		prionet.popsorted((data) => { normdata.topnet.push(data); });
	}	

	return [normdata];
}

const hostCol = [
	{
		title :		'Service Name',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	120,
		fixed : 	'left',
		render : 	text => <Button type="link">{text}</Button>,
	},	
	{
		title :		'Service State',
		key :		'state',
		dataIndex :	'state',
		gytype :	'string',
		width : 	100,
		render : 	state => StateBadge(state, state),
	},	
	{
		title :		'QPS',
		key :		'qps5s',
		dataIndex :	'qps5s',
		gytype :	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},
	{
		title :		'5 sec Avg Response',
		key :		'resp5s',
		dataIndex :	'resp5s',
		gytype :	'number',
		width : 	100,
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'5 sec p95 Response',
		key :		'p95resp5s',
		dataIndex :	'p95resp5s',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'5 min p95 Response',
		key :		'p95resp5m',
		dataIndex :	'p95resp5m',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'5 sec # Queries',
		key :		'nqry5s',
		dataIndex :	'nqry5s',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'# Active Conns',
		key :		'nactive',
		dataIndex :	'nactive',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'Server Errors',
		key :		'sererr',
		dataIndex :	'sererr',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'Client Errors',
		key :		'clierr',
		dataIndex :	'clierr',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'Process Delays',
		key :		'delayus',
		dataIndex :	'delayus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		'CPU Delays',
		key :		'cpudelus',
		dataIndex :	'cpudelus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		'Disk IO Delays',
		key :		'iodelus',
		dataIndex :	'iodelus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		'Memory Delays',
		key :		'vmdelus',
		dataIndex :	'vmdelus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		'# Total Conns',
		key :		'nconns',
		dataIndex :	'nconns',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'Net Inbound',
		key :		'kbin15s',
		dataIndex :	'kbin15s',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => kbStrFormat(num),
	},
	{
		title :		'Net Outbound',
		key :		'kbout15s',
		dataIndex :	'kbout15s',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => kbStrFormat(num),
	},
	{
		title :		'Service Issue Cause',
		key :		'issue',
		dataIndex :	'issue',
		gytype :	'number',
		width : 	150,
		responsive : 	['lg'],
		render :	(num) => SvcIssueSource[num] ? SvcIssueSource[num].name : '',
	},
	{
		title :		'User CPU %',
		key :		'usercpu',
		dataIndex :	'usercpu',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'System CPU %',
		key :		'syscpu',
		dataIndex :	'syscpu',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'Memory RSS MB',
		key :		'rssmb',
		dataIndex :	'rssmb',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'# Processes',
		key :		'nprocs',
		dataIndex :	'nprocs',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'# Process Issues',
		key :		'nissue',
		dataIndex :	'nissue',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'State Description',
		key :		'desc',
		dataIndex :	'desc',
		gytype :	'string',
		responsive : 	['lg'],
		width : 	300,
	},
];

const globalCol = [
	...hostCol,
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		responsive : 	['lg'],
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

export const hostRangeCol = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed : 	'left',
	},
	...hostCol,
];

const globRangeCol = [
	...hostRangeCol,
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		responsive : 	['lg'],
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

export const hostAggrCol = (aggrType) => {
	
	aggrType 		= capitalFirstLetter(aggrType);

	const			astr = aggrType ?? 'Avg';
	const			ignsum = aggrType === 'Sum' ? 'Avg' : aggrType;

	return [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed : 	'left',
	},
	{
		title :		'Service Name',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	120,
		render : 	text => <Button type="link">{text}</Button>,
		fixed : 	'left',
	},	
	{
		title :		`${ignsum} QPS`,
		key :		'qps5s',
		dataIndex :	'qps5s',
		gytype :	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},
	{
		title :		`${ignsum} Response`,
		key :		'resp5s',
		dataIndex :	'resp5s',
		gytype :	'number',
		width : 	100,
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'5 sec p95 Response',
		key :		'p95resp5s',
		dataIndex :	'p95resp5s',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'5 min p95 Response',
		key :		'p95resp5m',
		dataIndex :	'p95resp5m',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'# Service Issues',
		key :		'svcissue',
		dataIndex :	'svcissue',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : 'green' }} >{num} of {rec.inrecs}</span>,
	},
	{
		title :		`${astr} Total Queries`,
		key :		'nqry5s',
		dataIndex :	'nqry5s',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		`${ignsum} Active Conns`,
		key :		'nactive',
		dataIndex :	'nactive',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		`${aggrType} Server Errors`,	// Using aggrType instead of astr as default is sum
		key :		'sererr',
		dataIndex :	'sererr',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : 'green' }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Client Errors`,	// Using aggrType instead of astr as default is sum
		key :		'clierr',
		dataIndex :	'clierr',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : 'green' }} >{format(",")(num)}</span>,
	},
	{
		title :		`${astr} Proc Delays`,
		key :		'delayus',
		dataIndex :	'delayus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		`${astr} CPU Delays`,
		key :		'cpudelus',
		dataIndex :	'cpudelus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		`${astr} Disk Delays`,
		key :		'iodelus',
		dataIndex :	'iodelus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		`${astr} Memory Delays`,
		key :		'vmdelus',
		dataIndex :	'vmdelus',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => usecStrFormat(num),
	},
	{
		title :		`${ignsum} Total Conns`,
		key :		'nconns',
		dataIndex :	'nconns',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		`${aggrType} Net Inbound`,	// Using aggrType instead of astr as default is sum
		key :		'kbin15s',
		dataIndex :	'kbin15s',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => kbStrFormat(num),
	},
	{
		title :		`${aggrType} Net Outbound`,	// Using aggrType instead of astr as default is sum
		key :		'kbout15s',
		dataIndex :	'kbout15s',
		gytype :	'number',
		width : 	120,
		responsive : 	['lg'],
		render :	(num) => kbStrFormat(num),
	},
	{
		title :		`${ignsum} User CPU %`,
		key :		'usercpu',
		dataIndex :	'usercpu',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		`${ignsum} System CPU %`,
		key :		'syscpu',
		dataIndex :	'syscpu',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		`${ignsum} Memory RSS MB`,
		key :		'rssmb',
		dataIndex :	'rssmb',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		`${astr} # Processes`,
		key :		'nprocs',
		dataIndex :	'nprocs',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
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
		title :		'Degrades by Process',
		key :		'inproc',
		dataIndex :	'inproc',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by QPS',
		key :		'inqps',
		dataIndex :	'inqps',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Active Conn',
		key :		'inaconn',
		dataIndex :	'inaconn',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Server Errors',
		key :		'inhttperr',
		dataIndex :	'inhttperr',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Host CPU',
		key :		'inoscpu',
		dataIndex :	'inoscpu',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Degrades by Host Memory',
		key :		'inosmem',
		dataIndex :	'inosmem',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},

	];
};

const globAggrCol = (aggrType) => {
	return [
	...hostAggrCol(aggrType),
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		responsive : 	['lg'],
		fixed : 	'right',
		width :		150,
	},
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		fixed : 	'right',
		width :		150,
		responsive : 	['lg'],
	},

	];
};

const extsvcColumns = [
	{
		title :		'Listener IP',
		key :		'ip',
		dataIndex :	'ip',
		gytype : 	'string',
		width :		140,
	},	
	{
		title :		'Listener Port',
		key :		'port',
		dataIndex :	'port',
		gytype : 	'number',
		width : 	100,
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
		title :		'5 day p95 Response',
		key :		'p95resp5d',
		dataIndex :	'p95resp5d',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'5 day Avg Response',
		key :		'avgresp5d',
		dataIndex :	'avgresp5d',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
	},
	{
		title :		'p95 Queries/sec',
		key :		'p95qps',
		dataIndex :	'p95qps',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'p95 Active Conns',
		key :		'p95qps',
		dataIndex :	'p95qps',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render :	(num) => format(",")(num),
	},
	{
		title :		'Domain Name',
		key :		'svcdns',
		dataIndex :	'svcdns',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		150,
	},	
	{
		title :		'Tag Name',
		key :		'svctag',
		dataIndex :	'svctag',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		150,
	},	
	{
		title :		'Virtual IP 1',
		key :		'svcip1',
		dataIndex :	'svcip1',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		140,
	},	
	{
		title :		'Virtual Port 1',
		key :		'svcport1',
		dataIndex :	'svcport1',
		gytype : 	'number',
		responsive : 	['lg'],
		width : 	100,
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
];

function getSvcinfoColumns(istime, useHostFields)
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
		});
	}


	const tarr = [
		{
			title :		'Service Name',
			key :		'name',
			dataIndex :	'name',
			gytype : 	'string',
			width : 	120,
			render : 	text => <Button type="link">{text}</Button>,
			fixed : 	'left',
		},	
		{
			title :		'Listener IP',
			key :		'ip',
			dataIndex :	'ip',
			gytype : 	'string',
			width :		140,
		},	
		{
			title :		'Listener Port',
			key :		'port',
			dataIndex :	'port',
			gytype : 	'number',
			width : 	100,
		},	
		{
			title :		'Start Time',
			key :		'tstart',
			dataIndex :	'tstart',
			gytype : 	'string',
			width :		160,
		},	
		{
			title :		'5 day p95 Response',
			key :		'p95resp5d',
			dataIndex :	'p95resp5d',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => msecStrFormat(num),
		},
		{
			title :		'5 day Avg Response',
			key :		'avgresp5d',
			dataIndex :	'avgresp5d',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => msecStrFormat(num),
		},
		{
			title :		'p95 Queries/sec',
			key :		'p95qps',
			dataIndex :	'p95qps',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => format(",")(num),
		},
		{
			title :		'p95 Active Conns',
			key :		'p95aconn',
			dataIndex :	'p95aconn',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => format(",")(num),
		},
		{
			title :		'Domain Name',
			key :		'svcdns',
			dataIndex :	'svcdns',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
		},	
		{
			title :		'Tag Name',
			key :		'svctag',
			dataIndex :	'svctag',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
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
			title :		'Virtual IP 1',
			key :		'svcip1',
			dataIndex :	'svcip1',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		140,
		},	
		{
			title :		'Virtual Port 1',
			key :		'svcport1',
			dataIndex :	'svcport1',
			gytype : 	'number',
			responsive : 	['lg'],
			width : 	100,
		},	

		{
			title :		'Virtual IP 2',
			key :		'svcip2',
			dataIndex :	'svcip2',
			gytype : 	'string',
			responsive : 	['lg'],
			width : 	140,
		},	
		{
			title :		'Virtual Port 2',
			key :		'svcport2',
			dataIndex :	'svcport2',
			gytype : 	'number',
			responsive : 	['lg'],
			width : 	100,
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
			title :		'Mesh Cluster Count',
			key :		'nsvcmesh',
			dataIndex :	'nsvcmesh',
			gytype : 	'number',
			responsive : 	['lg'],
			width : 	100,
		},	
		{
			title :		'Virtual IP 1 Cluster Count',
			key :		'nip1svc',
			dataIndex :	'nip1svc',
			gytype : 	'number',
			responsive : 	['lg'],
			width : 	100,
		},	
		{
			title :		'Virtual IP 2 Cluster Count',
			key :		'nip1svc',
			dataIndex :	'nip1svc',
			gytype : 	'number',
			responsive : 	['lg'],
			width : 	100,
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

function getSvcsummColumns(istime, useHostFields)
{
	const colarr = [];

	if (istime) {
		colarr.push({
			title :		'Time',
			key :		'time',
			dataIndex :	'time',
			gytype :	'string',
			width :		140,
			fixed : 	'left',
		});
	}

	if (useHostFields) {
		colarr.push({
			title :		'Host',
			key :		'host',
			dataIndex :	'host',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'left',
			render : 	text => <Button type="link">{text}</Button>,
		});

		colarr.push({
			title :		'Cluster Name',
			key :		'cluster',
			dataIndex :	'cluster',
			gytype :	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'left',
		});
	}


	const tarr = [
		{
			title :		'Severe State Services',
			key :		'nsevere',
			dataIndex :	'nsevere',
			gytype :	'number',
			render :	(num) => <span style={{ color : num > 0 ? getStateColor('Severe') : undefined }} >{format(",")(num)}</span>,
		},
		{
			title :		'Bad State Services',
			key :		'nsevere',
			dataIndex :	'nsevere',
			gytype :	'number',
			render :	(num) => <span style={{ color : num > 0 ? getStateColor('Bad') : undefined }} >{format(",")(num)}</span>,
		},
		{
			title :		'Queries/sec',
			key :		'totqps',
			dataIndex :	'totqps',
			gytype :	'number',
			render :	(num) => format(",")(num),
		},
		{
			title :		'Active Connections',
			key :		'totaconn',
			dataIndex :	'totaconn',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => format(",")(num),
		},
		{
			title :		'Services Inbound Traffic',
			key :		'totkbin',
			dataIndex :	'totkbin',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => kbStrFormat(num),
		},
		{
			title :		'Services Outbound Traffic',
			key :		'totkbout',
			dataIndex :	'totkbout',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => kbStrFormat(num),
		},
		{
			title :		'Server Errors',
			key :		'totsererr',
			dataIndex :	'totsererr',
			gytype :	'number',
			render :	(num) => <span style={{ color : num > 0 ? 'red' : 'green' }} >{format(",")(num)}</span>,
		},
		{
			title :		'State OK Services',
			key :		'nok',
			dataIndex :	'nok',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => <span style={{ color : num > 0 ? getStateColor('OK') : undefined }} >{format(",")(num)}</span>,
		},
		{
			title :		'Good State Services',
			key :		'ngood',
			dataIndex :	'ngood',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => <span style={{ color : num > 0 ? getStateColor('Good') : undefined }} >{format(",")(num)}</span>,
		},
		{
			title :		'Idle State Services',
			key :		'nidle',
			dataIndex :	'nidle',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => <span style={{ color : num > 0 ? getStateColor('Idle') : undefined }} >{format(",")(num)}</span>,
		},
		{
			title :		'Active Services',
			key :		'nactive',
			dataIndex :	'nactive',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => format(",")(num),
		},
		{
			title :		'Total Services',
			key :		'nsvc',
			dataIndex :	'nsvc',
			gytype :	'number',
			responsive : 	['lg'],
			render :	(num) => format(",")(num),
		},
	];

	return (colarr.length > 0 ? [...colarr, ...tarr] : tarr);
}

function SvcStateQuickFilters({filterCB, useHostFields})
{
	if (typeof filterCB !== 'function') return null;

	const 		numregex = /^\d+$/;

	const onName = (value) => {
		filterCB(`{ name ~ ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onBadsvc = (value) => {
		filterCB(`{ state in 'Bad','Severe' }`);
	};	

	const onQPS = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ qps5s > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onAvgResp = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ resp5s > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onp95Resp = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ p95resp5s > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onserErr = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ sererr > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onprocDelay = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ delayus > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	


	const onProcIssue = () => {
		filterCB(`{ issue = 1 }`);
	};	

	const onHighQPS = () => {
		filterCB(`{ issue = 2 }`);
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
	<span style={{ fontSize : 14 }}><i><strong>Service Name Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onName} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service State is Bad or Severe </strong></i></span>
	</div>
	<div style={{ width : 270, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onBadsvc} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service Queries/sec QPS greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="QPS" allowClear onSearch={onQPS} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service 5 sec Avg Response Time msec greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Response msec" allowClear onSearch={onAvgResp} style={{ width: 200 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service 5 sec p95 Response Time msec greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Response msec" allowClear onSearch={onp95Resp} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service Server Errors greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="# Server Errors" allowClear onSearch={onserErr} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>


	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service Process Delays in microsec greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Delays usec" allowClear onSearch={onprocDelay} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service Response High due to Process Issues </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onProcIssue} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service Response High due to Higher QPS </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onHighQPS} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	{useHostFields === true && 
		<>
		<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
		<div>
		<span style={{ fontSize : 14, marginRight : 30 }}><i><strong>Hostname of Service Like </strong></i></span>
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
		<span style={{ fontSize : 14 }}><i><strong>Cluster Name of Service Like </strong></i></span>
		</div>
		<div>
		<Search placeholder="Regex like" allowClear onSearch={onCluster} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
		</div>
		</div>
		</>}


	</>
	);
}	

export function SvcStateMultiQuickFilter({filterCB, useHostFields = true, isext = false, linktext, quicklinktext})
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
			title : <Title level={4}>Service State Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} 
					filterfields={isext ? [...svcstatefields, ...extsvcfields] : svcstatefields} useHostFields={useHostFields} />,
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
			title : <Title level={4}>Service State Quick Filters</Title>,

			content : <SvcStateQuickFilters filterCB={onFilterCB} useHostFields={useHostFields} />,
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
		<Button onClick={quickfilter} >{quicklinktext ?? "Quick Filters"}</Button>
		<span> OR </span>
		<Button onClick={multifilters} >{linktext ?? "Advanced Filters"}</Button>
		</Space>
		</>
	);	

}

export function SvcStateAggrFilter({filterCB, isext = false, linktext})
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
			title : <Title level={4}>Service State Aggregation Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} 
					filterfields={isext ? [...aggrsvcstatefields, ...extsvcfields] : aggrsvcstatefields} />,
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

export function SvcinfoFilter({filterCB, linktext, useHostFields})
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
			title : <Title level={4}>Service Info Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={svcinfofields} useHostFields={useHostFields} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields]);	

	return <Button onClick={multifilters} >{linktext ?? "Service Info Filters"}</Button>;	
}

export function SvcSummFilter({filterCB, linktext, useHostFields})
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
			title : <Title level={4}>Service Summary Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={svcsummfields} useHostFields={useHostFields} />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields]);	

	return <Button onClick={multifilters} >{linktext ?? "Service Summary Filters"}</Button>;	
}


function parseSvcSiblingInfo(apidata)
{
	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Service Info data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Service Sibling Info Error seen : ${apidata[0].errmsg}`);
	}	

	if (!(apidata.length === 1 && ('array' === safetypeof(apidata[0].svcinfo)))) {
		return {};
	}	

	return apidata[0];
}


function getSvcSiblingConf(svcid, parid, relsvcid, starttime)
{
	if (!svcid) {
		throw new Error(`Mandatory svcid property missing for Service Sibling Info`);
	}

	if (!parid) {
		throw new Error(`Mandatory parid property missing for Service Sibling Info`);
	}

	if (!relsvcid) {
		throw new Error(`Mandatory relsvcid property missing for Service Sibling Info`);
	}

	const		filter = `( { svcinfo.relsvcid = '${relsvcid}' } and { svcinfo.svcid != '${svcid}' } )`; 

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


function SvcSiblingInfo({svcid, svcname, parid, relsvcid, starttime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi(getSvcSiblingConf(svcid, parid, relsvcid, starttime), parseSvcSiblingInfo, [], 'Service Sibling Info API');

	let		title = null, hinfo = null;

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && data.svcinfo) { 
			
			title = (<div style={{ textAlign : 'center' }}><Title level={4}>{data.svcinfo.length} Sibling Listeners for Service <em>{svcname || ''}</em></Title></div>);

			hinfo = data.svcinfo.map((rec, index) => ( <SvcInfoDesc svcid={rec.svcid} parid={parid ?? rec.parid} starttime={starttime} key={index}  isTabletOrMobile={isTabletOrMobile} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} /> ));
		}
		else {
			hinfo = (<Alert type="error" showIcon message="Invalid or No Valid data found on server..." description=<Empty /> />);
			console.log(`Svc Sibling Info Data Invalid seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		
		console.log(`Svc Sibling Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
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


export function parseSvcInfo(apidata)
{
	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Service Info data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Service Info Error seen : ${apidata[0].errmsg}`);
	}	

	if (!(apidata.length === 1 && ('array' === safetypeof(apidata[0].svcinfo)) && apidata[0].svcinfo.length && ('object' === safetypeof(apidata[0].svcinfo[0])))) {
		return {};
	}	

	return apidata[0];
}

export function getSvcInfoApiConf(svcid, parid, starttime)
{
	if (!svcid) {
		throw new Error(`Mandatory svcid property missing for Service Info`);
	}

	return {
		url 	: NodeApis.svcinfo,
		method	: 'post',
		data 	: {
			qrytime		: Date.now(),
			starttime	: starttime,
			timeoutsec 	: 30,
			parid		: parid,
			filter		: `{ svcid = '${svcid}' }`,
		},
		timeout	: 30000,
	};	
}	

// Specify svcInfoObj if data already available 
export function SvcInfoDesc({svcid, parid, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile, svcInfoObj})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi(!svcInfoObj ? getSvcInfoApiConf(svcid, parid, starttime) : null, parseSvcInfo, 
										!svcInfoObj ? [] : [{svcinfo : [svcInfoObj]}], 'Service Info API', !svcInfoObj);

	let		hinfo = null;

	const getSiblingSvc = () => {
		const			svc = data.svcinfo[0];

		Modal.info({
			title : <span><strong>Sibling Service Listeners of {svc.name}</strong></span>,
			content : <SvcSiblingInfo svcid={svc.svcid} svcname={svc.name} parid={parid} relsvcid={svc.relsvcid} starttime={starttime} isTabletOrMobile={isTabletOrMobile} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getHostInfo = (name) => {
		Modal.info({
			title : <span><strong>Host Info of service {name}</strong></span>,
			content : <HostInfoDesc parid={parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	


	const getSvcMonitor = () => {
		const		tabKey = `SvcMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service State Realtime Monitor</i></span>, 'Service Realtime Monitor', 
					() => { return <SvcMonitor svcid={svcid} parid={parid} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getSvcTimeState = () => {
		const		tstart = moment(starttime, starttime ? moment.ISO_8601 : undefined).subtract(5, 'minute').format();
		const		tend = endtime ?? moment(starttime, starttime ? moment.ISO_8601 : undefined).add(5, 'minute').format();
		const		tabKey = `SvcState_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service State around Record Time</i></span>, 'Service State',
				() => { return <SvcMonitor svcid={svcid} parid={parid} isRealTime={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};

	const getNetFlows = (name) => {
		const		tstart = moment(starttime, starttime ? moment.ISO_8601 : undefined).subtract(5, 'minute').format();
		const		tend = endtime ?? moment(starttime, starttime ? moment.ISO_8601 : undefined).add(5, 'minute').format();

		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Network Flows around Record Time</i></span>, 'Service Network Flows', 
					() => { return <NetDashboard svcid={svcid} svcname={name} parid={parid} autoRefresh={false} refreshSec={30} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};



	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && data.svcinfo && data.svcinfo[0].svcid && data.svcinfo[0].svcid === svcid) { 
			const			svc = data.svcinfo[0];

			hinfo = (
			<>
			<Descriptions title={`Service ${svc.name} Info`} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>

			<Descriptions.Item label={<em>Host Name</em>}>{data.hostinfo ? data.hostinfo.host : svc.host ? svc.host : 'Unknown'}</Descriptions.Item>
			<Descriptions.Item label={<em>Cluster Name</em>}>{data.hostinfo ? data.hostinfo.cluster : svc.cluster ? svc.cluster : 'Unknown'}</Descriptions.Item>
			<Descriptions.Item label={<em>Service Gyeeta ID</em>}>{svcid}</Descriptions.Item>
			<Descriptions.Item label={<em>Service Start Time</em>}>{svc.tstart}</Descriptions.Item>
			<Descriptions.Item label={<em>Listener IP</em>}>{svc.ip}</Descriptions.Item>
			<Descriptions.Item label={<em>Listener Port</em>}>{svc.port}</Descriptions.Item>
			<Descriptions.Item label={<em>Process Command Line</em>}>{svc.cmdline}</Descriptions.Item>
			<Descriptions.Item label={<em>Region Name</em>}>{svc.region}</Descriptions.Item>
			<Descriptions.Item label={<em>Zone Name</em>}>{svc.zone}</Descriptions.Item>
			{svc.svcport1 !== 0 && <Descriptions.Item label={<em>Virtual IP</em>}>{svc.svcip1}</Descriptions.Item>}
			{svc.svcport1 !== 0 && <Descriptions.Item label={<em>Virtual Port</em>}>{svc.svcport1}</Descriptions.Item>}
			{svc.svcport2 !== 0 && <Descriptions.Item label={<em>2nd Virtual IP</em>}>{svc.svcip2}</Descriptions.Item>}
			{svc.svcport2 !== 0 && <Descriptions.Item label={<em>2nd Virtual Port</em>}>{svc.svcport2}</Descriptions.Item>}
			{svc.svcdns.length > 0 && <Descriptions.Item label={<em>Domain Name</em>}>{svc.svcdns}</Descriptions.Item>}
			{svc.svctag.length > 0 && <Descriptions.Item label={<em>Service Tag</em>}>{svc.svctag}</Descriptions.Item>}
			<Descriptions.Item label={<em>Current 5 Day p95 Response</em>}>{format(",")(svc.p95resp5d)} msec</Descriptions.Item>
			<Descriptions.Item label={<em>Current 5 Day Avg. Response</em>}>{format(",")(svc.avgresp5d)} msec</Descriptions.Item>
			<Descriptions.Item label={<em>Current p95 QPS</em>}>{format(",")(svc.p95qps)}</Descriptions.Item>
			<Descriptions.Item label={<em>Current p95 Active Conns</em>}>{format(",")(svc.p95aconn)}</Descriptions.Item>

			<Descriptions.Item label={<em>Complete Record</em>}>{ButtonJSONDescribe({record : svc, fieldCols : svcinfofields})}</Descriptions.Item>

			</Descriptions>

			<div style={{ marginTop: 36, marginBottom: 16 }}>
			<Space direction="vertical">

			<Row justify="space-between">

			<Col span={parid ? 8 : 24}> <Button type='dashed' onClick={getSiblingSvc} >Get Sibling Services</Button></Col>
			{parid && <Col span={8}> <Button type='dashed' onClick={() => getHostInfo(svc.name)} >Service Host Information</Button> </Col>}

			</Row>

			<Row justify="space-between">

			<Col span={8}> {getSvcTimeState()} </Col>
			<Col span={8}> {getSvcMonitor()} </Col>

			</Row>


			<Row justify="space-between">

			<Col span={8}> {getNetFlows(svc.name)} </Col>

			</Row>

			</Space>
			</div>

			</>
			);
		}
		else {
			hinfo = (<Alert type="warning" showIcon message="Invalid or No Valid data found on server. Service Info may have been deleted." description=<Empty /> />);
			console.log(`Service Info Data Invalid seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		
		console.log(`Service Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
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

export function SvcModalCard({rec, parid, aggrMin, endtime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	if (!rec) {
		throw new Error(`No Data record specified for Service Modal`);
	}

	const			isaggr = (rec.inrecs !== undefined) ;

	if (isaggr && aggrMin === undefined) {
		aggrMin = 1;
	}	

	const			tstart = moment(rec.time, moment.ISO_8601).subtract(5, 'minute').format();
	const 			tend = getMinEndtime(rec.time, aggrMin ?? 1, endtime);

	const getSvcInfo = () => {
		Modal.info({
			title : <span><strong>Service {rec.name} Info</strong></span>,
			content : <SvcInfoDesc svcid={rec.svcid} parid={parid ?? rec.parid} starttime={rec.time} isTabletOrMobile={isTabletOrMobile}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Host of service {rec.name} Info</strong></span>,
			content : <HostInfoDesc parid={parid ?? rec.parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getSvcTimeState = () => {
		const		tabKey = `SvcState_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service Performance around Record Time</i></span>, 'Service State as per time',
				() => { return <SvcMonitor svcid={rec.svcid} parid={parid ?? rec.parid} isRealTime={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};

	const getSvcHistoricalState = useCallback((date, dateString, useAggr, dateAggrMin, aggrType) => {
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

		const		tabKey = `SvcHist_${Date.now()}`;
		
		CreateTab('Service Historical State',
			() => { return <SvcMonitor svcid={rec.svcid} parid={parid ?? rec.parid} isRealTime={false} 
					starttime={istimepoint ? dateString : dateString[0]} endtime={istimepoint ? undefined : dateString[1]} 
					aggregatesec={!istimepoint && useAggr && dateAggrMin ? dateAggrMin * 60 : undefined}
					aggregatetype={!istimepoint && useAggr ? aggrType : undefined}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
					isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);

	}, [rec, parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);

	const getSvcMonitor = () => {
		const		tabKey = `SvcMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service Realtime Monitor</i></span>, 'Service Realtime Monitor', 
					() => { return <SvcMonitor svcid={rec.svcid} parid={parid ?? rec.parid} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getNetFlows = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service Network Flows around Record Time</i></span>, 'Service Network Flows', 
					() => { return <NetDashboard svcid={rec.svcid} svcname={rec.name} parid={parid ?? rec.parid} autoRefresh={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getRelSvcID = async () => {
		const conf = 
		{
			url 	: NodeApis.svcinfo,
			method	: 'post',
			data : {
				starttime	:	tstart,
				endtime		:	tend,
				parid		:	parid ?? rec.parid,
				options : {
					maxrecs 	: 100,
					aggregate	: true,
					aggrsec		: 30 * 60 * 24,
					filter		: `svcid = '${rec.svcid}'`,
				},	
			},
		};	
		
		try {
			let 		res = await axios(conf);

			validateApi(res.data);

			if (safetypeof(res.data) === 'array') { 
				if (safetypeof(res.data[0]?.svcinfo) === 'array') {
					return  res.data[0].svcinfo[0]?.relsvcid;
				}	
			}
			return null;
		}	
		catch(e) {
			return null;
		}	
	};	

	const getProcInfo = () => {
		if (rec.relsvcid) {
			return procInfoTab({ parid : parid ?? rec.parid, starttime : tstart, endtime : tend, useAggr : true, aggrMin : 30 * 60 * 24,
				filter : `relsvcid = '${rec.relsvcid}'`, maxrecs : 1000,
				addTabCB, remTabCB, isActiveTabCB, modal : true, title : `Processes for Service ${rec.name}` });
		}	

		getRelSvcID().then((newrelsvcid) => newrelsvcid ? procInfoTab({ parid : parid ?? rec.parid, starttime : tstart, endtime : tend, useAggr : true, aggrMin : 30 * 60 * 24,
				filter : `relsvcid = '${newrelsvcid}'`, maxrecs : 1000,
				addTabCB, remTabCB, isActiveTabCB, modal : true, title : `Processes for Service ${rec.name}` }) : null)
			.catch((e) => {
			});	
	};	

	const getProcState = () => {
		if (rec.relsvcid) {
			return procTableTab({ parid : parid ?? rec.parid, starttime : tstart, endtime : tend, useAggr : true, aggrMin : 30 * 60 * 24,
				filter : `relsvcid = '${rec.relsvcid}'`, maxrecs : 1000, isext : true,
				addTabCB, remTabCB, isActiveTabCB, modal : true, title : `Processes State for Service ${rec.name}` });
		}	

		getRelSvcID().then((newrelsvcid) => newrelsvcid ? procTableTab({ parid : parid ?? rec.parid, starttime : tstart, endtime : tend, useAggr : true, aggrMin : 30 * 60 * 24,
				filter : `relsvcid = '${newrelsvcid}'`, maxrecs : 1000, isext : true,
				addTabCB, remTabCB, isActiveTabCB, modal : true, title : `Processes State for Service ${rec.name}` }) : null)
			.catch((e) => {
			});	
	};	

	const viewSvcFields = (key, value) => {
		if (key === 'state') {
			return StateBadge(value, value);
		}	
		else if (key === 'issue') {
			value = SvcIssueSource[value] ? SvcIssueSource[value].name : '';
		}	
		else if (typeof value === 'object' || typeof value === 'boolean') {
			value = JSON.stringify(value);
		}	

		return <span>{value}</span>;
	};

	return (
		<>
		<ErrorBoundary>

		{JSONDescription({jsondata : rec, titlestr : `${isaggr ? 'Aggregated' : '' } Service State for '${rec.name}'`,
					fieldCols : [...svcstatefields, ...aggrsvcstatefields, ...extsvcfields, ...hostfields], xfrmDataCB : viewSvcFields })}

		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={rec.parid ? 8 : 24}> <Button type='dashed' onClick={getSvcInfo} >Get Service '{rec.name}' Information</Button> </Col>
		{rec.parid && <Col span={8}> <Button type='dashed' onClick={getHostInfo} >Get Host '{rec.host}' Information</Button> </Col>}

		</Row>


		<Row justify="space-between">

		<Col span={8}> {getSvcTimeState()} </Col>
		<Col span={8}> {getSvcMonitor()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> 
			<TimeRangeAggrModal onChange={getSvcHistoricalState} title={`Get '${rec.name}' Historical Service States`} 
					showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />
		</Col>			
		<Col span={8}> {getNetFlows()} </Col>

		</Row>

		<Row justify="space-between">
		
		<Col span={8}> <Button type='dashed' onClick={getProcInfo} >Get '{rec.name}' Process Information</Button> </Col>
		<Col span={8}> <Button type='dashed' onClick={getProcState} >Get '{rec.name}' Process States</Button> </Col>

		</Row>

		</Space>
		</div>

		</ErrorBoundary>

		</>
	);	
}

export function ExtSvcDesc({rec})
{
	if (safetypeof(rec) !== 'object') {
		return null;
	}	

	return (
		<>
		<ErrorBoundary>

		<Descriptions style={{ textAlign: 'center' }}>
		
		{rec.ip && <Descriptions.Item label={<em>Listener IP Address</em>}>{rec.ip}</Descriptions.Item>}
		{rec.port && <Descriptions.Item label={<em>Listener Port</em>}>{rec.port}</Descriptions.Item>}
		{rec.tstart && <Descriptions.Item label={<em>Listener Start Time</em>}>{rec.tstart}</Descriptions.Item>}
		{rec.cmdline && <Descriptions.Item label={<em>Process Command Line</em>}>{rec.cmdline}</Descriptions.Item>}
		{rec.region && <Descriptions.Item label={<em>Region Name</em>}>{rec.region}</Descriptions.Item>}
		{rec.zone && <Descriptions.Item label={<em>Zone Name</em>}>{rec.zone}</Descriptions.Item>}
		{rec.p95resp5d && <Descriptions.Item label={<em>5 day p95 Response</em>}>{format(",")(rec.p95resp5d)} msec</Descriptions.Item>}
		{rec.avgresp5d && <Descriptions.Item label={<em>5 day Avg Response</em>}>{format(",")(rec.avgresp5d)} msec</Descriptions.Item>}
		{rec.p95qps && <Descriptions.Item label={<em>p95 Queries/sec</em>}>{format(",")(rec.p95qps)}</Descriptions.Item>}
		{rec.p95aconn && <Descriptions.Item label={<em>p95 Active Connections</em>}>{format(",")(rec.p95aconn)}</Descriptions.Item>}
		{rec.svcip1 && <Descriptions.Item label={<em>Virtual IP Address 1</em>}>{rec.svcip1}</Descriptions.Item>}
		{rec.svcport1 && <Descriptions.Item label={<em>Virtual Port 1</em>}>{rec.svcport1}</Descriptions.Item>}
		{rec.svcip2 && <Descriptions.Item label={<em>Virtual IP Address 2</em>}>{rec.svcip2}</Descriptions.Item>}
		{rec.svcport2 && <Descriptions.Item label={<em>Virtual Port 2</em>}>{rec.svcport2}</Descriptions.Item>}
		{rec.svcdns && <Descriptions.Item label={<em>Service Domain Name</em>}>{rec.svcdns}</Descriptions.Item>}
		{rec.svctag && <Descriptions.Item label={<em>Service Tag Name</em>}>{rec.svctag}</Descriptions.Item>}

		</Descriptions>

		</ErrorBoundary>
		</>
	);
}	

export function getSvcStateColumns({parid, isrange = true, useAggr, aggrType, isext})
{
	let			columns;

	if (!isrange) {
		columns = parid ? hostCol : globalCol;
	}	
	else {
		if (parid) {
			columns = !useAggr ? hostRangeCol : hostAggrCol(aggrType);
		}	
		else {
			columns = !useAggr ? globRangeCol : globAggrCol(aggrType);
		}	
	}	

	if (isext) {
		columns = getFixedColumns([...columns, ...extsvcColumns]);
	}	

	return columns;
}	

export function svcStateOnRow({parid, useAggr, aggrMin, endtime, addTabCB, remTabCB, isActiveTabCB})
{
	return (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Service {record.name}</strong></span>,
					content : (
						<>
						<SvcModalCard rec={record} parid={parid ?? record.parid} aggrMin={useAggr && aggrMin ? aggrMin : undefined} endtime={endtime}
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
	};
}	

export function SvcStateSearch({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, isext, 
					customColumns, customTableColumns, sortColumns, sortDir})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	const			[isrange, setisrange] = useState(false);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		let			mstart, mend;
		const			field = isext ? "extsvcstate" : "svcstate";

		if (starttime || endtime) {

			mstart = moment(starttime, moment.ISO_8601);

			if (endtime) {
				mend = moment(endtime, moment.ISO_8601);

				if (mend.unix() >= mstart.unix() + 10) {
					setisrange(true);
				}
			}
		}
	
		const conf = 
		{
			url 	: isext ? NodeApis.extsvcstate : NodeApis.svcstate,
			method	: 'post',
			data : {
				starttime,
				endtime,
				parid,
				timeoutsec 	: useAggr ? 500 : 100,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType,
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
				},	
			},
			timeout : useAggr ? 500 * 1000 : 100 * 1000,
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, field);
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Service State", 
				description : `Exception occured while waiting for Service State data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Service State fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, aggrMin, aggrType, doFetch, endtime, filter, aggrfilter, maxrecs, starttime, useAggr, isext, customColumns, customTableColumns, sortColumns, sortDir]);

	if (isloading === false && isapierror === false) { 
		const			field = isext ? "extsvcstate" : "svcstate";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {
			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					tableOnRow = svcStateOnRow({parid, useAggr, aggrMin, endtime, addTabCB, remTabCB, isActiveTabCB});
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

			let		columns, rowKey, titlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
				titlestr = "Service State";
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}	
			else if (!isrange) {
				rowKey = "svcid";

				if (parid) {
					titlestr = `Services State for Host ${hostname ?? ''}`;
				}	
				else {
					if (!name) {
						titlestr = 'Global Service State';
					}
					else {
						titlestr = `${name} Services State`;
					}	
				}	

				timestr = <span style={{ fontSize : 14 }} ><strong> at {starttime ?? moment().format("MMMM Do YYYY HH:mm:ss.SSS Z")} </strong></span>;
			}
			else {
				rowKey = ((record) => record.rowid ?? record.svcid + record.time);

				if (parid) {
					titlestr = `${useAggr ? 'Aggregated ' : ''} Services State for Host ${hostname ?? ''}`;
				}
				else {
					titlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : 'Global'} Services State`;
				}	
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss.SSS Z")} to {moment(endtime, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss.SSS Z")}</strong></span>;
			}	

			if (!columns) {
				columns = getSvcStateColumns({parid, isrange, useAggr, aggrType, isext});
			}	

			const 			expandedRowRender = (rec) => <ExtSvcDesc rec={rec} />;

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				{timestr}
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

export function svcTableTab({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, isext, modal, title, 
					customColumns, customTableColumns, sortColumns, sortDir, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Service State Query", description : `Invalid starttime specified for Service State : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Service State Query", description : `Invalid endtime specified for Service State : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Service State Query", description : `Invalid endtime specified for Service State : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	if (!modal) {
		const			tabKey = `SvcState_${Date.now()}`;

		CreateTab(title ?? "Service State", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<SvcStateSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						isext={isext} tabKey={tabKey} hostname={hostname} customColumns={customColumns} customTableColumns={customTableColumns} 
						sortColumns={sortColumns} sortDir={sortDir} /> 
					</>
					);
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Service State",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<SvcStateSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					isext={isext} hostname={hostname} customColumns={customColumns} customTableColumns={customTableColumns}
					sortColumns={sortColumns} sortDir={sortDir} />
				</>
				),
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Close',
			okType : 'default',
		});	
	}	
}

export function SvcinfoSearch({parid, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey,
					customColumns, customTableColumns, sortColumns, sortDir})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.svcinfo,
			method	: 'post',
			data : {
				starttime,
				endtime,
				parid,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType,
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
				},	
			},
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, "svcinfo");
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Service Info", 
				description : `Exception occured while waiting for Service Info data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Service Info fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, aggrMin, aggrType, doFetch, endtime, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir]);

	if (isloading === false && isapierror === false) { 
		const			field = "svcinfo";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {
			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Service {record.name} Info</strong></span>,
									content : <SvcInfoDesc svcid={record.svcid} parid={record.parid ?? parid} svcInfoObj={record} starttime={record.time} 
											addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,

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
									title : <span><strong>Service {record.name} Info</strong></span>,
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

			let		columns, rowKey, titlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
				titlestr = "Service Info";
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}
			else if (parid) {
				columns = getSvcinfoColumns(true, false);
				rowKey = "time";

				titlestr = 'Services Info';

				timestr = <span style={{ fontSize : 14 }} ><strong> at {starttime ?? moment().format()} </strong></span>;
			}
			else {
				rowKey = ((record) => record.rowid ?? (record.time + record.parid ? record.parid : ''));
				columns = getSvcinfoColumns(true, true);

				titlestr = `${useAggr ? 'Aggregated ' : ''} Service Info `;
			
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}	

			if (name) {
				titlestr += ` for ${name}`;
			}	

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				{timestr}
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.svcinfo} rowKey={rowKey} scroll={getTableScroll()} />
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

export function svcInfoTab({parid, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title,
					customColumns, customTableColumns, sortColumns, sortDir})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Service Info Query", description : `Invalid starttime specified for Service Info : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Service Info Query", description : `Invalid endtime specified for Service Info : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Service Info Query", description : `Invalid endtime specified for Service Info : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	if (!modal) {
		const			tabKey = `Svcinfo_${Date.now()}`;

		CreateTab(title ?? "Service Info", 
			() => { return <SvcinfoSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} /> }, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Service Info",

			content : <SvcinfoSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Close',
			okType : 'default',
		});	
	}	
}

export function SvcSummSearch({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey,
					customColumns, customTableColumns, sortColumns, sortDir})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.svcsumm,
			method	: 'post',
			data : {
				starttime,
				endtime,
				parid,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType,
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
				},	
			},
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, "svcsumm");
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Service Summary", 
				description : `Exception occured while waiting for Service Summary data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Service Summary fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, aggrMin, aggrType, doFetch, endtime, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir]);

	if (isloading === false && isapierror === false) { 
		const			field = "svcsumm";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {
			if (typeof tableOnRow !== 'function') {
				const getSvcDash = (record) => {
					if (record && record.parid) {
						let			tstarttime = record.time, tendtime;
						const			tabKey = `SvcDashboard_${Date.now()}`;

						if (useAggr && aggrMin) {
							tendtime = moment(tstarttime, moment.ISO_8601).add(aggrMin, 'minute').format();
						}	
					
						return CreateLinkTab('Get Host Service Dashboard around Record', 'Host Svc Dashboard', 
							() => { return <SvcDashboard parid={record.parid} autoRefresh={false} starttime={tstarttime} endtime={tendtime} filter={filter} name={record.host}
										addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
									/> }, tabKey, addTabCB);
					}
					return null;
				};

				tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							Modal.info({
								title : <span><strong>Service Summary</strong></span>,
								content : (
									<>
									<JSONDescription jsondata={record} titlestr={`Service Summary for Host '${record.host}'`}
												column={3} fieldCols={[...svcsummfields, ...hostfields]} />
									<div style={{ marginTop : 50 }} />
									{getSvcDash(record)}
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

			let		columns, rowKey, titlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
				titlestr = "Service Summary";
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}
			else if (parid) {
				columns = getSvcsummColumns(true, false);
				rowKey = "time";

				titlestr = `Services Summary for Host ${hostname}`;

				timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format()} </span>;
			}
			else {
				rowKey = ((record) => record.time + record.parid ? record.parid : '');
				columns = getSvcsummColumns(true, true);

				titlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : 'Global'} Services Summary`;
			
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}	

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				{timestr}
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.svcsumm} rowKey={rowKey} scroll={getTableScroll()} />
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

export function svcSummTab({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title,
					customColumns, customTableColumns, sortColumns, sortDir})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Service Summary Query", description : `Invalid starttime specified for Service Summary : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Service Summary Query", description : `Invalid endtime specified for Service Summary : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Service Summary Query", description : `Invalid endtime specified for Service Summary : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	if (!modal) {
		const			tabKey = `SvcSumm_${Date.now()}`;

		CreateTab(title ?? "Service Summary", 
			() => { return <SvcSummSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} 
					hostname={hostname} /> }, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Service Summary",

			content : <SvcSummSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} hostname={hostname} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Close',
			okType : 'default',
		});	
	}	
}

export function SvcSummary({normdata, parid, filter, name, hostname, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	if (!normdata.summstats) {
		throw new Error(`Invalid Data format seen for Service Summary`);
	}	

	let		useAggr;
	const		isrange = (starttime && endtime);

	if (isrange && (!normdata.summstats || !normdata.hostinfo)) {
		throw new Error(`Invalid Data format seen for Host Service Range Summary`);
	}	
	else if (isrange) {
		useAggr = (moment(endtime, moment.ISO_8601).unix() - moment(starttime, moment.ISO_8601).unix() >= 1800);
	}	

	const 		summstats = normdata.summstats;

	if (!summstats.time) {
		return <Alert type="error" showIcon message="Null Data Encountered" description="Null Data seen for Host Service Summary : Please try another time period" />;
	}	

	const linkButton = (linktext, desc, newfilter) => {
		if (filter) {
			if (newfilter) {
				newfilter = `( ${filter} and ${newfilter} )`;
			}
			else {
				newfilter = filter;
			}	
		}

		return <Button type='dashed' onClick={() => {
			svcTableTab({parid, hostname, starttime : !isrange ? summstats.time : starttime, endtime : !isrange ? undefined : endtime, 
					useAggr, filter : newfilter, name, addTabCB, remTabCB, isActiveTabCB, isext : true});
		}} >{linktext}</Button>;
	};
	
	const		titlestr = normdata.hostinfo ? `Service Summary for ${normdata.hostinfo.host} of cluster ${normdata.hostinfo.cluster}` :
					name ? `${name} Service Summary` : `Global Service Summary`;

	const title = (<div style={{ textAlign : 'center' }}>
		{<><Title level={4}>{titlestr}</Title>
		<Space>
		{!isrange && <span style={{ fontSize : 14 }} > at {summstats.time} ({moment(summstats.time, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss.SSS Z")}) </span>}
		{isrange && <span style={{ fontSize : 14 }} > for Time Range between <em>{starttime}</em> and <em>{endtime}</em> </span>}
		</Space>
		</>} 
		</div>);

	const statestr = (<><Space size={isTabletOrMobile ? 'small' : 'large'}>
				{!isTabletOrMobile && StateBadge('Idle', 
					linkButton(`${summstats.nidle} Idle`, 'Idle Services', `({ state = 'Idle' })`))} 	
				{!isTabletOrMobile && StateBadge('Good', 
					linkButton(`${summstats.ngood} Good`, 'Good Services', `({ state = 'Good' })`))} 	
				{!isTabletOrMobile && StateBadge('OK', 
					linkButton(`${summstats.nok} OK`, 'OK Services', `({ state = 'OK' })`))} 	
				{StateBadge('Bad', 
					linkButton(`${summstats.nbad} Bad`, 'Bad Services', `({ state = 'Bad' })`))} 	
				{StateBadge('Severe', 
					linkButton(`${summstats.nsevere} Severe`, 'Severe Services', `({ state = 'Severe' })`))} 	
			</Space></>);

	const rangestr = isrange ? "Avg" : "";

	return (
		<Descriptions title={title} bordered={true} column={{ xxl: 2, xl: 2, lg: 2, md: 2, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em># {rangestr} Total Services</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(summstats.nsvc)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {rangestr} Active Services</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(summstats.nactive)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{rangestr} Service Status</em>} 
				span={2}>{statestr}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {rangestr.length ? rangestr : 'Cumulative'} Queries/sec QPS</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(summstats.totqps)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {rangestr} Server Errors</em>}>
				<Statistic valueStyle={{ fontSize: 16, color : summstats.totsererr > 0 ? 'red' : undefined }} value={format(",")(summstats.totsererr)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {rangestr} Active Connections</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(summstats.totaconn)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {rangestr} Network Inbound</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={kbStrFormat(summstats.totkbin)} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {rangestr} Network Outbound</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={kbStrFormat(summstats.totkbout)} />
			</Descriptions.Item>


		</Descriptions>
	);		
}

export function SvcDashboard({parid, autoRefresh, refreshSec, starttime, endtime, filter, name, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile})
{
	const 		objref = useRef(null);

	const 		[fetchIntervalmsec, ] = useState(autoRefresh && refreshSec >= 5 ? refreshSec * 1000 : svcfetchsec * 1000);
	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[, setTimeSlider] = useState();
	const		[, setPauseRefresh] = useState();
	const		[isPauseRefresh, pauseRefresh] = useState(false);

	if (objref.current === null) {
		console.log(`Svc Dashboard initializing ...`);

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
		console.log(`Svc Dashboard initial Effect called...`);

		return () => {
			console.log(`Svc Dashboard destructor called...`);
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

				if (mend.unix() >= mstart.unix() + 2 * svcfetchsec) {
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
		throw new Error(`Internal Error : Service Dashboard validProps check failed`);
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

	const tableOnRow = useCallback((record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Service {record.name}</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						<SvcModalCard rec={record} parid={parid ?? record.parid} isTabletOrMobile={isTabletOrMobile} 
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
	
	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 10) => {
		return {
			url 	: NodeApis.topsvc,
			method	: 'post',
			data : {
				qrytime		: Date.now(),
				parid		: parid,
				timeoutsec 	: timeoutsec,
				options 	: { 
					send_summstats	: true, 
					send_topissue 	: true, 
					send_topqps 	: true, 
					send_topactconn : true,
					send_topnet 	: true,
					filter		: filter,
				
					...fetchparams,
				},	

			},
			timeout : timeoutsec * 1000,
		};
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

				console.log(`Fetching Svc Dashboard for config ${JSON.stringify(conf)}`);

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
					const		ndata = norm_top_listeners(res.data);

					setApiData({data : ndata, isloading : false, isapierror : false});
				
					fixedArrayAddItems(ndata, objref.current.datahistarr, 10);

					objref.current.nerrorretries = 0
					objref.current.isstarted = true;

					if (parid && ndata[0].hostinfo?.host) {
						objref.current.hostname = ndata[0].hostinfo.host;
					}	
				}
				else {
					setApiData({data : [], isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Data fetch... Will retry a few times later."});

					if (objref.current.nerrorretries++ < 5) {
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

				if (objref.current.nerrorretries++ < 5) {
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
			console.log(`Destructor called for Svc interval effect...`);
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
				if (datahistarr[i] && datahistarr[i].summstats) {
					const 		summstats = datahistarr[i].summstats;

					markobj[i] = moment(summstats.time, moment.ISO_8601).format("HH:mm:ss");
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

		const			tabKey = `SvcDashboard_${Date.now()}`;
		
		CreateTab(parid ? 'Host Service Dashboard' : 'Service Dashboard', 
			() => { return <SvcDashboard parid={parid} autoRefresh={false} starttime={tstarttime} endtime={tendtime} filter={filter} name={name}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [parid, filter, name, addTabCB, remTabCB, isActiveTabCB]);	

	const onNewAutoRefresh = useCallback(() => {
		const			tabKey = (parid || filter) ? `SvcDashboard_${Date.now()}` : svcDashKey;
		
		CreateTab(parid ? 'Host Service Dashboard' : filter ? 'Service Dashboard' : 'Global Services', 
			() => { return <SvcDashboard parid={parid} autoRefresh={true} filter={filter} name={name}
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

		svcTableTab({parid, hostname : parid ? objref.current.hostname : undefined, starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, 
				filter : fstr, aggrfilter, name, maxrecs, addTabCB, remTabCB, isActiveTabCB, isext : true});

	}, [parid, filter, name, addTabCB, remTabCB, isActiveTabCB, objref]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range' showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <SvcStateMultiQuickFilter filterCB={onfiltercb} useHostFields={!parid} isext={true} />;
	}, [parid]);	

	const aggrfiltercb = useCallback((onfiltercb) => {
		return <SvcStateAggrFilter filterCB={onfiltercb} isext={true} />;
	}, []);	

	const svcinfocb = (filt) => {
		let			newfil;

		if (filter && filt) {
			newfil = `(${filter} and ${filt})`;
		}
		else if (filter) newfil = filter;
		else newfil = filt;

		svcInfoTab(
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
		});
	};

	const optionDiv = (width) => {
		const		searchtitle = `Search ${parid ? 'Host' : name ? name : 'Global'} Service States`;
		const		infotitle = `Get Info for all ${parid ? 'Host' : name ? name : 'Global'} Services`;

		return (
			<div style={{ marginLeft: 30, marginRight: 30, marginBottom : 30, width: width, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', 
						border: '1px groove #7a7aa0', padding : 10 }} >

			<div>
			<Space>

			<ButtonModal buttontext={searchtitle} width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onStateSearch} title={searchtitle} 
						timecompcb={timecb} filtercompcb={filtercb} aggrfiltercb={aggrfiltercb} 
						ismaxrecs={true} defaultmaxrecs={50000} />
				)} />
					
			<Button onClick={() => (
				Modal.confirm({
					title : <span style={{ fontSize : 16 }} ><strong>Apply Optional Service Info Filters</strong></span>,

					content : <MultiFilters filterCB={svcinfocb} filterfields={svcinfofields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Service Info List',
					onOk : () => svcinfocb(),
					okType : 'primary',
					cancelType : 'primary',
				})	

				)}>{infotitle}</Button>
					
			{!parid && <Button onClick={() => {
						const			tabKey = filter ? `SvcGroup_${Date.now()}` : svcGroupKey;

						addTabCB('Service Groups', () => <SvcClusterGroups starttime={starttime} endtime={endtime} filter={filter}
									addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />, tabKey);
					}} >Get Service Groups</Button>}
			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>
			{autoRefresh && isPauseRefresh === false && (<Button onClick={() => {pauseRefresh(true)}}>Pause Auto Refresh</Button>)}
			{autoRefresh && isPauseRefresh === true && (<Button onClick={() => {objref.current.nextfetchtime = Date.now() + 1000; pauseRefresh(false)}}>Resume Auto Refresh</Button>)}

			{!autoRefresh && (<Button onClick={() => {onNewAutoRefresh()}}>Auto Refreshed Dashboard</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Service Dashboard'
					showTime={true} showRange={parid !== undefined} minAggrRangeMin={0} maxAggrRangeMin={0} disableFuture={true} />
			</Space>
			</div>

			</div>
		);
	};	

	let			hdrtag = null, bodycont = null;

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && safetypeof(normdata[0].topissue) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
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

				<>
				<section style={{ textAlign: 'center', marginTop: 10, marginBottom: 10  }}>
				<SvcSummary normdata={normdata[0]} parid={parid} name={name} hostname={objref.current.hostname} filter={filter}
					tableOnRow={tableOnRow} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile}
					starttime={objref.current.isrange && !autoRefresh ? starttime : undefined} endtime={objref.current.isrange && !autoRefresh ? endtime : undefined} 
				/>
				</section>


				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 16 }} >
				<Title level={4}>Top {parid && !objref.current.isrange ? 10 : 50} Services with Issues</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostCol : globalCol) : hostRangeCol} dataSource={normdata[0].topissue} onRow={tableOnRow} 
						rowKey={!objref.current.isrange ? "svcid" : ((record) => record.svcid + record.time)} 
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Services with Top Queries/sec (QPS)</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostCol : globalCol) : hostRangeCol} 
						dataSource={normdata[0].topqps} onRow={tableOnRow} 
						rowKey={!objref.current.isrange ? "svcid" : ((record) => record.svcid + record.time)}
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Services with Max Active Connections</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostCol : globalCol) : hostRangeCol} 
						dataSource={normdata[0].topactconn} onRow={tableOnRow} 
						rowKey={!objref.current.isrange ? "svcid" : ((record) => record.svcid + record.time)}
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				<div style={{ textAlign: 'center', marginTop: 70, marginBottom: 16 }} >
				<Title level={4}>Services with Max Network In + Out Traffic</Title>
				<GyTable columns={!objref.current.isrange ? (parid ? hostCol : globalCol) : hostRangeCol} dataSource={normdata[0].topnet} onRow={tableOnRow} 
						rowKey={!objref.current.isrange ? "svcid" : ((record) => record.svcid + record.time)}
						modalCount={modalCount} scroll={getTableScroll()} />
				</div>

				</>

				</>
			);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && safetypeof(data[0].topissue) === 'array') { 
			if (autoRefresh) {
				
				let		pausetag = null;

				if (true === objref.current.pauseRefresh || true === isPauseRefresh) {
					pausetag = <Tag color='blue'>Auto Refresh Paused</Tag>;
				}

				hdrtag = (
					<>
					<Tag color='green'>Running with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>
					{pausetag}
					</>);
			}
			else {
				hdrtag = <Tag color='blue'>Auto Refresh Disabled</Tag>;
			}	

			bodycont = getContent(data, <Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);

			objref.current.prevdata = data;
		}
		else {
			hdrtag = (<Tag color='red'>Data Error</Tag>);

			let			emsg;

			if (objref.current.nerrorretries++ < 5) {
				objref.current.nextfetchtime = Date.now() + 30000;

				emsg = "Invalid or no data seen. Will retry after a few seconds...";
			}
			else {
				objref.current.nextfetchtime = Date.now() + 60000;

				emsg = "Invalid or no data seen. Too many retry errors...";
			}	

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message={emsg} description=<Empty /> />);

			console.log(`Service Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Service Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

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

	
	const		titlestr = parid ? `Host ${objref.current.hostname} Service Dashboard` :
					name ? `${name} Service Dashboard` : `Global Service Dashboard`;
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

