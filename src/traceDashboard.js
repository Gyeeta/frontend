
import 			React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import			{Button, Modal, Input, Descriptions, Typography, Tag, Alert, notification, message, Badge, Empty, 
			Space, Popover, Popconfirm, Row, Col} from 'antd';
import 			{ CheckSquareTwoTone, CloseOutlined } from '@ant-design/icons';

import 			moment from 'moment';
import 			axios from 'axios';
import 			{format} from "d3-format";

import 			{GyTable, TimeFieldSorter, getTableScroll} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, CreateTab, useFetchApi, ComponentLife, usecStrFormat, bytesStrFormat,
			strTruncateTo, JSONDescription, timeDiffString, LoadingAlert, CreateLinkTab, getMinEndtime,
			mergeMultiMadhava, getLocalTime, ButtonModal, NumButton} from './components/util.js';
import 			{MultiFilters, SearchTimeFilter, createEnumArray, hostfields, SearchWrapConfig} from './multiFilters.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';
import			{NetDashboard} from './netDashboard.js';
import			{SvcMonitor} from './svcMonitor.js';
import			{SvcInfoDesc} from './svcDashboard.js';
import 			{HostInfoDesc} from './hostViewPage.js';
import			{procInfoTab} from './procDashboard.js';
import			{ProcMonitor} from './procMonitor.js';
import			{CPUMemPage} from './cpuMemPage.js';

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;
const 			{Search} = Input;

export const protocolEnum = [
	'HTTP1', 'HTTP2', 'Postgres', 'MySQL', 'Mongo', 'Redis', 'Unknown', 
];

const traceStatusEnum = [
	'Active', 'Stopped', 'Failed', 'Starting', 
];

export const tracereqfields = [
	{ field : 'req',		desc : 'Trace Request',			type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'respus',		desc : 'Response in usec',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'netin',		desc : 'Inbound Request Bytes',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'netout',		desc : 'Outbound Response Bytes',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'err',		desc : 'Error Response Code',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'errtxt',		desc : 'Error Text String',		type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'status',		desc : 'HTTP Status Code',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'app',		desc : 'Client Application String',	type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'user',		desc : 'Login Username String',		type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'db',			desc : 'Database Name',			type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'svcname',		desc : 'Service Name',			type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'sport',		desc : 'Service Listen Port',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'proto',		desc : 'Network Protocol',		type : 'enum',		subsys : 'tracereq',	valid : null, 		esrc : createEnumArray(protocolEnum) },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'tracereq',	valid : null, },
	{ field : 'tconn',		desc : 'Connection Start Timestamp',	type : 'timestamptz',	subsys : 'tracereq',	valid : null, },
	{ field : 'cip',		desc : 'Client IP Address',		type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'cport',		desc : 'Client TCP Port',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'nreq',		desc : 'Connection Request #',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'sessid',		desc : 'Server Connection Number',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'tracereq',	valid : null, },	
	{ field : 'connid',		desc : 'Connection Gyeeta ID',		type : 'string',	subsys : 'tracereq',	valid : null, },	
];

export const exttracefields = [
	{ field : 'cname',		desc : 'Client Process Name',		type : 'string',	subsys : 'exttracereq',	valid : null, },	
	{ field : 'csvc',		desc : 'Is Client a Service?',		type : 'boolean',	subsys : 'exttracereq',	valid : null, },	
	{ field : 'cprocid',		desc : 'Client Process Gyeeta ID',	type : 'string',	subsys : 'exttracereq',	valid : null, },	
	{ field : 'cparid',		desc : 'Client Partha ID',		type : 'string',	subsys : 'exttracereq',	valid : null, },
	{ field : 'cmadid',		desc : 'Client Madhava ID',		type : 'string',	subsys : 'exttracereq',	valid : null, },
];

export const aggrtracereqfields = [
	{ field : 'nreq',		desc : 'Total Request Count',					type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'avgrespus',		desc : 'Avg Response Time in usec',				type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'p99respus',		desc : 'p99 Percentile Response Time usec',			type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'maxrespus',		desc : 'Max Response Time in usec',				type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'nerr',		desc : 'Number of Errors',					type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'sumnetin',		desc : 'Total Inbound Request Bytes',				type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'sumnetout',		desc : 'Total Outbound Response Bytes',				type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'maxnetin',		desc : 'Max Inbound Request Bytes',				type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'maxnetout',		desc : 'Max Outbound Response Bytes',				type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'nconns',		desc : 'Number of TCP connections',				type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'resplt300us',	desc : '# Req with Response less than 300 usec',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'resplt1ms',		desc : '# Req with Response between 300 usec and 1 msec',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'resplt10ms',		desc : '# Req with Response between 1 msec and 10 msec',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'resplt30ms',		desc : '# Req with Response between 10 msec and 30 msec',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'resplt100ms',	desc : '# Req with Response between 30 msec and 100 msec',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'resplt300ms',	desc : '# Req with Response between 100 msec and 300 msec',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'resplt1sec',		desc : '# Req with Response between 300 msec and 1 sec',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'respgt1sec',		desc : '# Req with Response greater than 1 sec',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'svcname',		desc : 'Service Name',						type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'sport',		desc : 'Service Listen Port',					type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'app',		desc : 'Client Application String',				type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'user',		desc : 'Login Username String',					type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'db',			desc : 'Database Name',						type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'cip',		desc : 'Client IP Address',					type : 'string',	subsys : 'tracereq',	valid : null, },

	{ field : 'proto',		desc : 'Network Protocol',					type : 'enum',		subsys : 'tracereq',	valid : null, 		
																esrc : createEnumArray(protocolEnum) },
	{ field : 'time',		desc : 'Timestamp of Record',					type : 'timestamptz',	subsys : 'tracereq',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',					type : 'string',	subsys : 'tracereq',	valid : null, },	
	{ field : 'inrecs',		desc : '# Records in Aggregation',				type : 'number',	subsys : 'tracereq',	valid : null, }
];


export const tracestatusfields = [
	{ field : 'name',		desc : 'Service Name',			type : 'string',	subsys : 'tracestatus',	valid : null, },
	{ field : 'port',		desc : 'Listener Port',			type : 'number',	subsys : 'tracestatus',	valid : null, },
	{ field : 'state',		desc : 'Trace Status',			type : 'enum',		subsys : 'tracestatus',	valid : null, 		esrc : createEnumArray(traceStatusEnum) },
	{ field : 'proto',		desc : 'Network Protocol',		type : 'enum',		subsys : 'tracestatus',	valid : null, 		esrc : createEnumArray(protocolEnum) },
	{ field : 'nreq',		desc : 'Total Requests Seen',		type : 'number',	subsys : 'tracestatus',	valid : null, },
	{ field : 'nerr',		desc : 'Total Errors Seen',		type : 'number',	subsys : 'tracestatus',	valid : null, },
	{ field : 'istls',		desc : 'Is TLS / SSL Encrypted?',	type : 'boolean',	subsys : 'tracestatus',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'tracestatus',	valid : null, },
	{ field : 'tstart',		desc : 'Trace Start Timestamp',		type : 'timestamptz',	subsys : 'tracestatus',	valid : null, },
	{ field : 'tend',		desc : 'Trace End Timestamp',		type : 'timestamptz',	subsys : 'tracestatus',	valid : null, },
	{ field : 'tlast',		desc : 'Last Status Timestamp',		type : 'timestamptz',	subsys : 'tracestatus',	valid : null, },
	{ field : 'region',		desc : 'Service Region Name',		type : 'string',	subsys : 'tracestatus',	valid : null, },
	{ field : 'zone',		desc : 'Service Zone Name',		type : 'string',	subsys : 'tracestatus',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'tracestatus',	valid : null, },	
	{ field : 'defid',		desc : 'Trace Definition ID',		type : 'string',	subsys : 'tracestatus',	valid : null, },	
];

export const aggrtracestatusfields = [
	...tracestatusfields,
	{ field : 'inrecs',		desc : '# Records in Aggregation',	type : 'number',	subsys : 'tracestatus',	valid : null, },
];

export const tracehistoryfields = [
	{ field : 'name',		desc : 'Service Name',			type : 'string',	subsys : 'tracehistory',	valid : null, },
	{ field : 'port',		desc : 'Listener Port',			type : 'number',	subsys : 'tracehistory',	valid : null, },
	{ field : 'state',		desc : 'Trace Status',			type : 'enum',		subsys : 'tracehistory',	valid : null, 		esrc : createEnumArray(traceStatusEnum) },
	{ field : 'proto',		desc : 'Network Protocol',		type : 'enum',		subsys : 'tracehistory',	valid : null, 		esrc : createEnumArray(protocolEnum) },
	{ field : 'info',		desc : 'Status Info',			type : 'string',	subsys : 'tracehistory',	valid : null, },
	{ field : 'istls',		desc : 'Is TLS / SSL Encrypted?',	type : 'boolean',	subsys : 'tracehistory',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'tracehistory',	valid : null, },
	{ field : 'region',		desc : 'Service Region Name',		type : 'string',	subsys : 'tracehistory',	valid : null, },
	{ field : 'zone',		desc : 'Service Zone Name',		type : 'string',	subsys : 'tracehistory',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'tracehistory',	valid : null, },	
];


export const tracedeffields = [
	{ field : 'name',		desc : 'Trace Definition Name',		type : 'string',	subsys : 'tracedef',	valid : null, },
	{ field : 'tstart',		desc : 'Creation Time',			type : 'timestamptz',	subsys : 'tracedef',	valid : null, },
	{ field : 'tend',		desc : 'End Time of Definition',	type : 'timestamptz',	subsys : 'tracedef',	valid : null, },
	{ field : 'filter',		desc : 'Trace Filters for Service',	type : 'string',	subsys : 'tracedef',	valid : null, },
	{ field : 'defid',		desc : 'Tracedef Gyeeta ID',		type : 'string',	subsys : 'tracedef',	valid : null, },	
];

export const traceAggrOutputArr = [ 
				{ label : 'Service Level Aggregation', value : 'svc' } ,
				{ label : 'Application Name', value : 'app' },
				{ label : 'Username', value : 'user' },
				{ label : 'DB Name', value : 'db' },
				{ label : 'Client IP', value : 'cip' },
				{ label : 'All Columns Aggregation', value : 'all' },
				{ label : 'Custom Columns', value : 'custom' } 
];

function getTraceStateColor(state)
{
	let		color;

	switch (state) {

	case 'Active'	: color = "MediumSeaGreen"; break;
	case 'Stopped'	: color = "Gray"; break;
	case 'Failed'	: color = "Tomato"; break;
	case 'Starting'	: color = "LightGray"; break;

	default		: color = "LightGray"; break;
	}	

	return color;
}	

function TraceStateBadge(state)
{
	const		color = getTraceStateColor(state);

	return <Badge color={color} text={state} />;
}	

function getTracereqColumns(useextFields, useHostFields)
{
	const colarr = [
		{
			title :		'Time',
			key :		'time',
			dataIndex :	'time',
			gytype :	'string',
			width :		170,
			fixed : 	'left',
			render :	(val) => getLocalTime(val, true),
		},	
		{
			title :		'Request API',
			key :		'req',
			dataIndex :	'req',
			gytype : 	'string',
			render :	(val) => strTruncateTo(val, 100),
			width :		300,
		},	
		{
			title :		'Response Time',
			key :		'respus',
			dataIndex :	'respus',
			gytype :	'number',
			width : 	120,
			render :	(num) => usecStrFormat(num),
		},
		{
			title :		'Error Code',
			key :		'err',
			dataIndex :	'err',
			gytype :	'number',
			width : 	100,
			render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{num}</span>,
		},
		{
			title :		'Service Name',
			key :		'svcname',
			dataIndex :	'svcname',
			gytype : 	'string',
			width : 	120,
			render :	(val) => <Button type="link">{val}</Button>,
		},	
		{
			title :		'Listener Port',
			key :		'sport',
			dataIndex :	'sport',
			gytype : 	'number',
			width : 	100,
			responsive : 	['lg'],
		},	
		{
			title :		'Request Bytes',
			key :		'netin',
			dataIndex :	'netin',
			gytype :	'number',
			width : 	140,
			render :	(num) => bytesStrFormat(num),
		},
		{
			title :		'Response Bytes',
			key :		'netout',
			dataIndex :	'netout',
			gytype :	'number',
			width : 	140,
			render :	(num) => bytesStrFormat(num),
		},
		{
			title :		'Error Text',
			key :		'errtxt',
			dataIndex :	'errtxt',
			gytype :	'string',
			width : 	160,
			render :	(str) => <span style={{ color : 'red' }} >{strTruncateTo(str, 50)}</span>,
			responsive : 	['lg'],
		},
		{
			title :		'Application Name',
			key :		'app',
			dataIndex :	'app',
			gytype :	'string',
			width : 	150,
			render :	(val) => strTruncateTo(val, 40),
		},
		{
			title :		'Login Username',
			key :		'user',
			dataIndex :	'user',
			gytype :	'string',
			width : 	140,
		},
		{
			title :		'DB Name',
			key :		'db',
			dataIndex :	'db',
			gytype :	'string',
			width : 	140,
		},
		{
			title :		'HTTP Status',
			key :		'status',
			dataIndex :	'status',
			gytype : 	'number',
			width : 	100,
			render :	(num) => <span style={{ color : num >= 400 ? 'red' : undefined }} >{num}</span>,
		},	
		{
			title :		'Net Protocol',
			key :		'proto',
			dataIndex :	'proto',
			gytype :	'string',
			width : 	120,
		},
		{
			title :		'Client IP',
			key :		'cip',
			dataIndex :	'cip',
			gytype : 	'string',
			width :		140,
			responsive : 	['lg'],
		},	
		{
			title :		'Client Port',
			key :		'cport',
			dataIndex :	'cport',
			gytype : 	'number',
			width : 	100,
			responsive : 	['lg'],
		},	
		{
			title :		'Connection Start',
			key :		'tconn',
			dataIndex :	'tconn',
			gytype : 	'string',
			width :		160,
			responsive : 	['lg'],
			render : 	(val) => timeDiffString(val),
		},	
		{
			title :		'Conn Request #',
			key :		'nreq',
			dataIndex :	'nreq',
			gytype : 	'number',
			width : 	140,
			responsive : 	['lg'],
		},	
	];

	if (useextFields) {

		colarr.push(
			{
				title :		'Client Name',
				key :		'cname',
				dataIndex :	'cname',
				gytype : 	'string',
				responsive : 	['lg'],
				width :		120,
			},	
			{
				title :		'Is Client a Service?',
				key :		'csvc',
				dataIndex :	'csvc',
				gytype :	'boolean',
				width : 	100,
				responsive : 	['lg'],
				render : 	(val) => (val === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'gray'}}/>),
			},
			{
				title :		'Client Proc ID',
				key :		'cprocid',
				dataIndex :	'cprocid',
				gytype : 	'string',
				responsive : 	['lg'],
				width :		140,
			},	
			
		);

	}

	if (useHostFields) colarr.push(
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
		}
	);

	return colarr;
}

function getAggrTracereqColumns({useAppname, useUsername, useDBName, useCliIP, useHostFields})
{
	const colarr = [
		{
			title :		'Time',
			key :		'time',
			dataIndex :	'time',
			gytype :	'string',
			width :		170,
			fixed : 	'left',
			render :	(val) => getLocalTime(val, true),
		},	
		{
			title :		'Service Name',
			key :		'svcname',
			dataIndex :	'svcname',
			gytype : 	'string',
			width : 	120,
			fixed : 	'left',
			render :	(val) => <Button type="link">{val}</Button>,
		},	
		{
			title :		'Listener Port',
			key :		'sport',
			dataIndex :	'sport',
			gytype : 	'number',
			width : 	100,
			fixed : 	'left',
			responsive : 	['lg'],
		},	
	];

	if (useAppname) {
		colarr.push(
		{
			title :		'Application Name',
			key :		'app',
			dataIndex :	'app',
			gytype :	'string',
			width : 	150,
			render :	(val) => strTruncateTo(val, 40),
		},
		);	
	}	

	if (useUsername) {
		colarr.push(
		{
			title :		'Login Username',
			key :		'user',
			dataIndex :	'user',
			gytype :	'string',
			width : 	140,
		},
		);
	}	

	if (useDBName) {
		colarr.push(
		{
			title :		'DB Name',
			key :		'db',
			dataIndex :	'db',
			gytype :	'string',
			width : 	140,
		},
		);
	}

	if (useCliIP) {
		colarr.push(
		{
			title :		'Client IP',
			key :		'cip',
			dataIndex :	'cip',
			gytype : 	'string',
			width :		140,
			responsive : 	['lg'],
		},	
		);
	}

	colarr.push(
		{
			title :		'Total Requests',
			key :		'nreq',
			dataIndex :	'nreq',
			gytype :	'number',
			width : 	120,
			render :	(num) => format(",")(num),
		},
		{
			title :		'Avg Response',
			key :		'avgrespus',
			dataIndex :	'avgrespus',
			gytype :	'number',
			width : 	120,
			render :	(num) => usecStrFormat(num),
		},
		{
			title :		'p99 Response',
			key :		'p99respus',
			dataIndex :	'p99respus',
			gytype :	'number',
			width : 	120,
			render :	(num) => usecStrFormat(num),
		},
		{
			title :		'Max Response',
			key :		'maxrespus',
			dataIndex :	'maxrespus',
			gytype :	'number',
			width : 	120,
			render :	(num) => usecStrFormat(num),
		},
		{
			title :		'Total Errors',
			key :		'nerr',
			dataIndex :	'nerr',
			gytype :	'number',
			width : 	120,
			render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		},
		{
			title :		'Total Request Bytes',
			key :		'sumnetin',
			dataIndex :	'sumnetin',
			gytype :	'number',
			width : 	140,
			render :	(num) => bytesStrFormat(num),
		},
		{
			title :		'Total Response Bytes',
			key :		'sumnetout',
			dataIndex :	'sumnetout',
			gytype :	'number',
			width : 	140,
			render :	(num) => bytesStrFormat(num),
		},
		{
			title :		'# Connections',
			key :		'nconns',
			dataIndex :	'nconns',
			gytype :	'number',
			width : 	120,
			render :	(num) => format(",")(num),
		},
		{
			title :		'# Response < 300us',
			key :		'resplt300us',
			dataIndex :	'resplt300us',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'# Response < 1ms',
			key :		'resplt1ms',
			dataIndex :	'resplt1ms',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'# Response < 10ms',
			key :		'resplt10ms',
			dataIndex :	'resplt10ms',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'# Response < 30ms',
			key :		'resplt30ms',
			dataIndex :	'resplt30ms',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'# Response < 100ms',
			key :		'resplt100ms',
			dataIndex :	'resplt100ms',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'# Response < 300ms',
			key :		'resplt300ms',
			dataIndex :	'resplt300ms',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'# Response < 1sec',
			key :		'resplt1sec',
			dataIndex :	'resplt1sec',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'# Response > 1sec',
			key :		'respgt1sec',
			dataIndex :	'respgt1sec',
			gytype :	'number',
			width : 	140,
			render :	(num, rec) => <span>{`${format(",")(num)} (${(num * 100/rec.inrecs).toFixed(2)} %)`}</span>,
		},
		{
			title :		'Max Request Bytes',
			key :		'maxnetin',
			dataIndex :	'maxnetin',
			gytype :	'number',
			width : 	140,
			responsive : 	['lg'],
			render :	(num) => bytesStrFormat(num),
		},
		{
			title :		'Max Response Bytes',
			key :		'maxnetout',
			dataIndex :	'maxnetout',
			gytype :	'number',
			width : 	140,
			responsive : 	['lg'],
			render :	(num) => bytesStrFormat(num),
		},
		{
			title :		'Net Protocol',
			key :		'proto',
			dataIndex :	'proto',
			gytype :	'string',
			width : 	120,
			responsive : 	['lg'],
		},
	);

	if (useHostFields) colarr.push(
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
		}
	);

	return colarr;
}


function traceReqOnRow({parid, endtime, useAggr, aggrMin, addTabCB, remTabCB, isActiveTabCB, modalCount})
{
	return (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span style={{ textAlign: 'center' }}><strong>{record.svcname} Trace API</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						<TraceReqModalCard rec={record} parid={parid ?? record.parid} endtime={endtime}
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

function aggrTraceReqOnRow({parid, endtime, aggrMin, addTabCB, remTabCB, isActiveTabCB, modalCount})
{
	return (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span style={{ textAlign: 'center' }}><strong>{record.svcname} Trace API</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						<AggrTraceReqModalCard rec={record} parid={parid ?? record.parid} endtime={endtime} aggrMin={aggrMin}
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


function TraceReqModalCard({rec, parid, endtime, titlestr, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const			fieldCols = rec.cname !== undefined ? [...tracereqfields, ...exttracefields, ...hostfields] : tracereqfields;
	const			keyNames = { respus : 'Response Time', };

	if (!rec) {
		throw new Error(`No Data record specified for Trace Request Modal`);
	}

	const			tstart = moment(rec.time, moment.ISO_8601).subtract(5, 'minute').format();
	const 			tend = moment(rec.time, moment.ISO_8601).add(rec.respus/60000000 + 1, 'minute').format();

	const getSvcInfo = () => {
		Modal.info({
			title : <span><strong>Service {rec.svcname} Info</strong></span>,
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
		
		return CreateLinkTab(<span><i>Service State around Record Time</i></span>, 'Service State as per time',
				() => { return <SvcMonitor svcid={rec.svcid} parid={parid ?? rec.parid} isRealTime={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};

	const getCliTimeState = () => {

		if (!rec.cprocid) return;

		const		tabKey = `CliState_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Client State around Record Time</i></span>, 'Client State as per time',
				() => { return <ProcMonitor procid={rec.cprocid} parid={rec.cparid} isRealTime={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};

	const getCpuMemTimeState = () => {
		const		tabKey = `CpuMemState_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Get CPU Memory State around record time</i></span>, 'Host CPU Memory State as per time',
				() => { return <CPUMemPage parid={parid ?? rec.parid} isRealTime={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};


	const getSvcNetFlows = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service Network Flows around Record Time</i></span>, 'Service Network Flows', 
					() => { return <NetDashboard svcid={rec.svcid} svcname={rec.svcname} parid={parid ?? rec.parid} autoRefresh={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getCliNetFlows = () => {

		if (!rec.cprocid) return;

		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Client Network Flows around Record Time</i></span>, 'Client Network Flows', 
					() => { return <NetDashboard procid={rec.cprocid} procname={rec.cname} parid={rec.cparid} isprocsvc={rec.csvc} 
							autoRefresh={false} starttime={tstart} endtime={tend}
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

	const getSvcProcInfo = () => {
		getRelSvcID().then((newrelsvcid) => newrelsvcid ? procInfoTab({ parid : parid ?? rec.parid, starttime : tstart, endtime : tend, useAggr : true, aggrMin : 300 * 60 * 24,
				filter : `relsvcid = '${newrelsvcid}'`, maxrecs : 1000,
				addTabCB, remTabCB, isActiveTabCB, modal : true, title : `Processes for Service ${rec.svcname}` }) : null)
			.catch((e) => {
			});	
	};	


	const viewTraceFields = (key, value, rec) => {
		if (key === 'respus') {
			value = usecStrFormat(value);
		}	
		else if (key === 'netin' || key === 'netout') {
			value = bytesStrFormat(value);
		}	
		else if (key === 'err' && value !== 0) {
			return <span style={{ color : 'red'}} >{value}</span>;
		}	
		else if (key === 'errtxt') {
			return <span style={{ color : 'red'}} >{value}</span>;
		}	
		else if (typeof value === 'object' || typeof value === 'boolean') {
			value = JSON.stringify(value);
		}	

		return <span>{value}</span>;
	};


	return (
		<>
		<ErrorBoundary>
		
		<div style={{ overflowX : 'auto', overflowWrap : 'anywhere', margin: 30, padding: 30, border: '1px groove #d9d9d9', maxHeight : 200 }} >
		<h2 style={{ textAlign: 'center' }}>Request API</h2>
		<p>
		<code style={{ fontFamily: 'Consolas,"courier new"', fontSize: '105%', textAlign: 'center' }}>{rec.req}</code>
		</p>
		</div>

		<div style={{ overflowX : 'auto', overflowWrap : 'anywhere', margin: 30, padding: 10, border: '1px groove #d9d9d9', maxHeight : 400 }} >
		<JSONDescription jsondata={rec} titlestr={titlestr ?? 'Record'} fieldCols={fieldCols} column={2}
				ignoreKeyArr={[ 'req', 'rowid', 'uniqid', 'nprep', 'tprep' ]} xfrmDataCB={viewTraceFields} keyNames={keyNames} />
		</div>

		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={8}> <Button type='dashed' onClick={getSvcInfo} >Get Service '{rec.svcname}' Information</Button> </Col>
		<Col span={8}> {getCpuMemTimeState()} </Col>

		</Row>


		<Row justify="space-between">

		<Col span={8}> {getSvcTimeState()} </Col>
		<Col span={8}> {getCliTimeState()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getSvcNetFlows()} </Col>
		{rec.cprocid && <Col span={8}> {getCliNetFlows()} </Col>}

		</Row>

		<Row justify="space-between">
		
		<Col span={8}> <Button type='dashed' onClick={getSvcProcInfo} >Get Service '{rec.svcname}' Process Information</Button> </Col>
		{(rec.parid || parid) && <Col span={8}> <Button type='dashed' onClick={getHostInfo} >Get Host Information</Button> </Col>}

		</Row>

		</Space>
		</div>

		</ErrorBoundary>
		</>
	);	
}

function AggrTraceReqModalCard({rec, parid, endtime, aggrMin, titlestr, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const			fieldCols = [...aggrtracereqfields, ...hostfields];
	const			keyNames = { avgrespus : 'Avg Response Time', maxrespus : 'Max Response Time', p99respus : 'p99 Response Time', };

	if (!rec) {
		throw new Error(`No Data record specified for Aggr Trace Request Modal`);
	}

	const			tstart = moment(rec.time, moment.ISO_8601).subtract(1, 'minute').format();
	const 			tend = getMinEndtime(rec.time, aggrMin ?? 1, endtime);
	const			dursec = moment(tend, moment.ISO_8601).unix() - moment(tstart, moment.ISO_8601).unix();

	const getSvcInfo = () => {
		Modal.info({
			title : <span><strong>Service {rec.svcname} Info</strong></span>,
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
		
		return CreateLinkTab(<span><i>Service State around Record Time</i></span>, 'Service State as per time',
				() => { return <SvcMonitor svcid={rec.svcid} parid={parid ?? rec.parid} isRealTime={false} starttime={tstart} endtime={tend} 
							aggregatesec={dursec > 3600 ? 60 : undefined}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};

	const getCpuMemTimeState = () => {
		const		tabKey = `CpuMemState_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Get CPU Memory State around record time</i></span>, 'Host CPU Memory State as per time',
				() => { return <CPUMemPage parid={parid ?? rec.parid} isRealTime={false} starttime={tstart} endtime={tend} 
							aggregatesec={dursec > 3600 ? 60 : undefined}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};


	const getSvcNetFlows = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service Network Flows around Record Time</i></span>, 'Service Network Flows', 
					() => { return <NetDashboard svcid={rec.svcid} svcname={rec.svcname} parid={parid ?? rec.parid} autoRefresh={false} starttime={tstart} endtime={tend}
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

	const getSvcProcInfo = () => {
		getRelSvcID().then((newrelsvcid) => newrelsvcid ? procInfoTab({ parid : parid ?? rec.parid, starttime : tstart, endtime : tend, useAggr : true, aggrMin : 300 * 60 * 24,
				filter : `relsvcid = '${newrelsvcid}'`, maxrecs : 1000,
				addTabCB, remTabCB, isActiveTabCB, modal : true, title : `Processes for Service ${rec.svcname}` }) : null)
			.catch((e) => {
			});	
	};	


	const viewTraceFields = (key, value, rec) => {
		if (key === 'avgrespus' || key === 'maxrespus' || key === 'p99respus') {
			value = usecStrFormat(value);
		}	
		else if (key === 'sumnetin' || key === 'sumnetout' || key === 'maxnetin' || key === 'maxnetout') {
			value = bytesStrFormat(value);
		}	
		else if (key.startsWith('resplt') || key.startsWith('respgt')) {
			value = `${format(",")(value)} (${(value * 100/rec.inrecs).toFixed(2)} %)`;
		}	
		else if (key === 'nerr' && value !== 0) {
			return <span style={{ color : 'red'}} >{format(',')(value)}</span>;
		}	
		else if (typeof value === 'object' || typeof value === 'boolean') {
			value = JSON.stringify(value);
		}	

		return <span>{value}</span>;
	};

	return (
		<>
		<ErrorBoundary>

		<div style={{ overflowX : 'auto', overflowWrap : 'anywhere', margin: 30, padding: 10, border: '1px groove #d9d9d9', maxHeight : 400 }} >
		<JSONDescription jsondata={rec} titlestr={titlestr ?? 'Record'} fieldCols={fieldCols} column={2} xfrmDataCB={viewTraceFields} keyNames={keyNames} />
		</div>
		
		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={rec.parid ? 8 : 24}> <Button type='dashed' onClick={getSvcInfo} >Get Service '{rec.svcname}' Information</Button> </Col>
		{(rec.parid || parid) && <Col span={8}> <Button type='dashed' onClick={getHostInfo} >Get Host '{rec.host}' Information</Button> </Col>}

		</Row>


		<Row justify="space-between">

		<Col span={8}> {getSvcTimeState()} </Col>
		<Col span={8}> {getCpuMemTimeState()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getSvcNetFlows()} </Col>
		<Col span={8}> <Button type='dashed' onClick={getSvcProcInfo} >Get Service '{rec.svcname}' Process Information</Button> </Col>

		</Row>

		</Space>
		</div>

		
		</ErrorBoundary>
		</>
	);	
}

function getTracestatusColumns({istime = true, getTraceDefCB, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, monAutoRefresh })
{
	const			tarr = [];

	if (istime) {
		tarr.push( 
			{
				title :		'Time',
				key :		'time',
				dataIndex :	'time',
				gytype :	'string',
				width :		160,
				fixed : 	'left',
				render :	(val) => getLocalTime(val),
			}
		);
	}	

	const 			colarr = [
		{
			title :		'Service Name',
			key :		'name',
			dataIndex :	'name',
			gytype : 	'string',
			width : 	120,
		},
		{
			title :		'Listener Port',
			key :		'port',
			dataIndex :	'port',
			gytype : 	'number',
			width : 	100,
		},	
		{
			title :		'Trace Status',
			key :		'state',
			dataIndex :	'state',
			gytype : 	'string',
			width : 	100,
			render : 	state => TraceStateBadge(state),
		},	
		{
			title :		'Network Protocol',
			key :		'proto',
			dataIndex :	'proto',
			gytype : 	'string',
			width : 	100,
		},			
		{
			title :		'Total Requests',
			key :		'nreq',
			dataIndex :	'nreq',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => format(",")(num),
		},
		{
			title :		'Total Errors',
			key :		'nerr',
			dataIndex :	'nerr',
			gytype :	'number',
			width : 	100,
			responsive : 	['lg'],
			render :	(num) => format(",")(num),
		},
		{
			title :		'TLS Encrypted?',
			key :		'istls',
			dataIndex :	'istls',
			gytype :	'boolean',
			width : 	100,
			responsive : 	['lg'],
			render : 	(val) => (val === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'gray'}}/>),
		},
		{
			title :		'Trace Start Time',
			key :		'tstart',
			dataIndex :	'tstart',
			gytype : 	'string',
			width : 	120,
			render : 	(val) => timeDiffString(val),
		},
		{
			title :		'Trace End Time',
			key :		'tend',
			dataIndex :	'tend',
			gytype : 	'string',
			width : 	140,
			render : 	(val) => timeDiffString(val, true /* printago */),
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

	if (typeof getTraceDefCB === 'function') {
		colarr.push({
			title :		'Trace Definition',
			fixed : 	'right',
			width :		150,
			dataIndex :	'setdef',
			render : 	(_, record) => {
						return (
						<>
						{record.defid && (
							<Button type="link" onClick={() => getTraceDefCB(record.defid)} >Get Trace Definition</Button>
						)}
						</>
						);
					},	
		});	

	}


	colarr.push({
		title :		'Monitor Requests',
		fixed : 	'right',
		width :		150,
		dataIndex :	'setmon',
		render : 	(_, record) => {
					return (
					<>
					{ record.svcid && (
						<Button onClick={() => traceMonitorTab({ 
							svcid : record.svcid, svcname : record.name, parid : record.parid, 
							autoRefresh : !!monAutoRefresh, starttime, endtime, maxrecs : 10000, addTabCB, remTabCB, isActiveTabCB, 
							})} size='small' type='primary' shape='round' >View Trace Monitor</Button>
					)}
					</>
					);
				},	
	});	


	return [...tarr, ...colarr];
}


const tracehistoryCol = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		160,
		fixed : 	'left',
		sorter :	TimeFieldSorter,
		defaultSortOrder :	'descend',
		render :	(val) => getLocalTime(val),
		
	},
	{
		title :		'Service Name',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	120,
	},
	{
		title :		'Listener Port',
		key :		'port',
		dataIndex :	'port',
		gytype : 	'number',
		width : 	100,
	},	
	{
		title :		'Trace Status',
		key :		'state',
		dataIndex :	'state',
		gytype : 	'string',
		width : 	100,
		render : 	state => TraceStateBadge(state),
	},	
	{
		title :		'Network Protocol',
		key :		'proto',
		dataIndex :	'proto',
		gytype : 	'string',
		width : 	100,
	},			
	{
		title :		'Status Info',
		key :		'info',
		dataIndex :	'info',
		gytype : 	'string',
		width : 	300,
		render :	(val) => strTruncateTo(val, 100),
	},	
	{
		title :		'Is TLS Encrypted?',
		key :		'istls',
		dataIndex :	'istls',
		gytype :	'boolean',
		width : 	100,
		responsive : 	['lg'],
		render : 	(val) => (val === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'gray'}}/>),
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


function getTracedefColumns(viewCB, updateCB, deleteCB)
{
	const		colarr = [
	{
		title :		'Tracedef Name',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	300,
		render : 	(val, record) => <Button type="link" onClick={viewCB ? () => viewCB(record) : undefined}>{strTruncateTo(val, 100)}</Button>,
	},
	{
		title :		'Creation Time',
		key :		'tstart',
		dataIndex :	'tstart',
		gytype : 	'string',
		width : 	160,
		render : 	(val) => timeDiffString(val),
	},
	{
		title :		'Trace End Time',
		key :		'tend',
		dataIndex :	'tend',
		gytype : 	'string',
		width : 	160,
		render : 	(val) => timeDiffString(val),
	},
	{
		title :		'Trace Service Filters',
		key :		'filter',
		dataIndex :	'filter',
		gytype : 	'string',
		width : 	360,
		render : 	(val) => <code>{strTruncateTo(val, 100)}</code>,
	},
	];

	if (typeof deleteCB === 'function' || typeof updateCB === 'function') {

		colarr.push({
			title :		'Operations',
			dataIndex :	'delupd',
			render : 	(_, record) => {
						return (
						<>
						<Space>

						{typeof updateCB === 'function' && (
						<Popconfirm title="Do you want to change the Trace Definition End Time?" onConfirm={() => updateCB(record)}>
							<Button type="link">Change End Time</Button>
						</Popconfirm>	
						)}

						{typeof deleteCB === 'function' && (
						<Popconfirm title="Do you want to Delete this Trace Definition?" onConfirm={() => deleteCB(record)}>
							<Button type="link">Delete</Button>
						</Popconfirm>	
						)}

						</Space>
						</>
						);
					},	
		});	
	}

	return colarr;
}	

export function TracedefMultiFilter({filterCB, linktext})
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
			title : <Title level={4}>Trace Definition Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={tracedeffields} title='Trace Definition Filters' />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return (<Button onClick={multifilters} >{linktext ?? "Trace Definition Filters"}</Button>);	
}	


function getSvcInfo(svcid, parid, starttime, modalCount, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile)
{
	Modal.info({
		title : <span><strong>Service Info</strong></span>,
		content : (
			<>
			<ComponentLife stateCB={modalCount} />
			<SvcInfoDesc svcid={svcid} parid={parid} starttime={starttime} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
			</>
			),			
		width : '90%',	
		closable : true,
		destroyOnClose : true,
		maskClosable : true,
	});
}	

function getHostInfo(parid, modalCount, addTabCB, remTabCB, isActiveTabCB)
{
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
}	

export function TracestatusSearch({starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, 
					customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb, monAutoRefresh})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.tracestatus,
			method	: 'post',
			data : {
				starttime,
				endtime,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : undefined,
					aggroper	: aggrType,
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
					
			return mergeMultiMadhava(apidata, "tracestatus");
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Trace Status", 
				description : `Exception occured while waiting for Trace Status data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Trace Status fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [aggrMin, aggrType, doFetch, endtime, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					dataRowsCb(data.tracestatus?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, dataRowsCb]);	

	if (isloading === false && isapierror === false) { 
		const			field = "tracestatus";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			let		columns, rowKey, titlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
				titlestr = "Trace Status";
			}
			else {
				rowKey = ((record) => record.rowid ?? (record.time + record.svcid ? record.svcid : ''));
				columns = getTracestatusColumns({ starttime, endtime, addTabCB, remTabCB, isActiveTabCB, monAutoRefresh });

				titlestr = `${useAggr ? 'Aggregated ' : ''} Trace Status `;
			}	

			timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				{timestr}
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.tracestatus} rowKey={rowKey} scroll={getTableScroll()} />
				</div>
				</>
			);

		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching Trace Status data : ${typeof data === 'string' ? data : ""}`;

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

export function tracestatusTableTab({starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title,
					customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, monAutoRefresh, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Trace Status Query", description : `Invalid starttime specified for Trace Status : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Trace Status Query", description : `Invalid endtime specified for Trace Status : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Trace Status Query", description : `Invalid endtime specified for Trace Status : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? TracestatusSearch;

	if (!modal) {
		const			tabKey = `Tracestatus_${Date.now()}`;

		CreateTab(title ?? "Trace Status", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} 
						recoffset={recoffset} dataRowsCb={dataRowsCb} monAutoRefresh={monAutoRefresh} origComp={TracestatusSearch} /> 
					</>	
				);
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Trace Status",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<Comp starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} 
					recoffset={recoffset} dataRowsCb={dataRowsCb} monAutoRefresh={monAutoRefresh} origComp={TracestatusSearch} />
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


export function TracehistorySearch({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.tracehistory,
			method	: 'post',
			data : {
				options : {
					maxrecs,
					filter,
				},	
			},
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, "tracehistory");
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Trace History", 
				description : `Exception occured while waiting for Trace History data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Trace History fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs, ]);

	if (isloading === false && isapierror === false) { 
		const			field = "tracehistory";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {
			let		columns, rowKey, titlestr;

			rowKey = ((record) => record.time + record.svcid);
			columns = tracehistoryCol;

			titlestr = 'Trace History Log';
			
			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.tracehistory} rowKey={rowKey} scroll={getTableScroll()} />
				</div>
				</>
			);

		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching Trace History data : ${typeof data === 'string' ? data : ""}`;

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

export function TracereqSearch({parid, starttime, endtime, isext, filter, maxrecs, useAggr, aggrMin, aggrType, aggrfilter, aggrOutput, titlestr, tableOnRow, 
					addTabCB, remTabCB, isActiveTabCB, tabKey, customColumns, customTableColumns, sortColumns, sortDir, 
					recoffset, dataRowsCb, iscontainer, pauseUpdateCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	const			[isrange, setisrange] = useState(false);
	const 			objref = useRef({ modalCount : 0, });

	let			hinfo = null, closetab = 0;

	useEffect(() => {
		let			mstart, mend;
		const			field = isext ? "exttracereq" : "tracereq";

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
			url 	: isext ? NodeApis.exttracereq : NodeApis.tracereq,
			method	: 'post',
			data : {
				starttime,
				endtime,
				parid,
				timeoutsec 		: useAggr ? 500 : 200,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType,
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					aggroutput	: aggrOutput,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
					recoffset       : recoffset > 0 ? recoffset : undefined,
				},	
			},
			timeout : useAggr ? 500 * 1000 : 200 * 1000,
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, field);
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Trace Request", 
				description : `Exception occured while waiting for Trace Request data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Trace Request fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, doFetch, endtime, filter, maxrecs, useAggr, aggrMin, aggrType, aggrfilter, aggrOutput, starttime, isext, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					const			field = isext ? "exttracereq" : "tracereq";
					
					dataRowsCb(data[field]?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, isext, dataRowsCb]);	

	const setPauseUpdateCb = useCallback(() => {
		if (typeof pauseUpdateCb !== 'function') {
			return;
		}

		if (objref.current.modalCount > 0) {
			pauseUpdateCb(true);
		}	
		else {
			pauseUpdateCb(false);
		}	
		
	}, [objref, pauseUpdateCb]);	


	const modalCount = useCallback((isup) => {
		if (isup === true) {
			objref.current.modalCount++;
		}	
		else if (isup === false && objref.current.modalCount > 0) {
			objref.current.modalCount--;
		}	

		setPauseUpdateCb();

	}, [objref, setPauseUpdateCb]);	


	if (isloading === false && isapierror === false) { 
		const			field = isext ? "exttracereq" : "tracereq";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid Trace Request response received from server..."} />;
			closetab = 60000;
		}
		else {
			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					if (!useAggr) {
						tableOnRow = traceReqOnRow({parid, endtime, addTabCB, remTabCB, isActiveTabCB, modalCount});
					}	
					else {
						tableOnRow = aggrTraceReqOnRow({parid, aggrMin, endtime, addTabCB, remTabCB, isActiveTabCB, modalCount});
					}	
				}
				else {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>{record.name} Trace Record</strong></span>,
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

			let			columns, rowKey, timestr, titaggr = '';

			rowKey = 'rowid';

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
			}
			else if (!useAggr) {
				columns = getTracereqColumns(isext, !parid);
			}	
			else {
				columns = getAggrTracereqColumns({ 
						useAppname : !aggrOutput || aggrOutput === 'app' || aggrOutput === 'all',
						useUsername : !aggrOutput || aggrOutput === 'user' || aggrOutput === 'all',
						useDBName : !aggrOutput || aggrOutput === 'db' || aggrOutput === 'all',
						useCliIP : !aggrOutput || aggrOutput === 'cip' || aggrOutput === 'all', 
						useHostFields : !parid,
					});

				if (aggrOutput === 'app') titaggr = 'Application Name';
				else if (aggrOutput === 'user') titaggr = 'Username';
				else if (aggrOutput === 'db') titaggr = 'Database Name';
				else if (aggrOutput === 'cip') titaggr = 'Client IP';
				else if (aggrOutput === 'svc') titaggr = 'Service Level';
			}	

			if (!isrange) {
				timestr = <span style={{ fontSize : 14 }} ><strong> at {starttime ?? moment().format("MMM DD YYYY HH:mm:ss.SSS Z")} </strong></span>;
			}
			else {
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM DD YYYY HH:mm:ss.SSS Z")} to {moment(endtime, moment.ISO_8601).format("MMM DD YYYY HH:mm:ss.SSS Z")}</strong></span>;
			}	

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr ?? `${titaggr} ${useAggr ? 'Aggregation ' : ''} Trace Requests`}</Title>
				{timestr}
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data[field]} rowKey={rowKey} scroll={getTableScroll()} />
				</div>
				</>
			);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Trace Request Error Encountered" description={emsg} />;
		closetab = 60000;
	}	
	else {
		hinfo = <LoadingAlert />;
	}

	if (closetab > 1000 && tabKey && remTabCB && !iscontainer) {
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

export function tracereqTableTab({parid, starttime, endtime, isext, filter, maxrecs, useAggr, aggrMin, aggrType, aggrfilter, aggrOutput,
					tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, modal, title, titlestr,
					customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Trace Request Query", description : `Invalid starttime specified for Trace Request : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Trace Request Query", description : `Invalid endtime specified for Trace Request : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Trace Request Query", description : `Invalid endtime specified for Trace Request : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? TracereqSearch;

	if (!modal) {
		const			tabKey = `Tracereq_${Date.now()}`;

		CreateTab(title ?? "Trace Request", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp parid={parid} starttime={starttime} endtime={endtime} isext={isext} filter={filter} titlestr={titlestr}
						maxrecs={maxrecs} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} aggrfilter={aggrfilter} aggrOutput={aggrOutput}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} 
						recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={TracereqSearch} /> 
					</>	
				);
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Trace Request",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<Comp parid={parid} starttime={starttime} endtime={endtime} isext={isext} filter={filter} titlestr={titlestr}
					maxrecs={maxrecs} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} aggrfilter={aggrfilter} aggrOutput={aggrOutput}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} 
					recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={TracereqSearch} /> 
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


export function TracereqQuickFilters({filterCB, useHostFields})
{
	if (typeof filterCB !== 'function') return null;

	const 		numregex = /^\d+$/;

	const onReq = (value) => {
		filterCB(`{ req like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onError = () => {
		filterCB(`{ err != 0 }`);
	};	

	const onResponse = (value) => {
		if (numregex.test(value) && Number.isInteger(Number(value))) {
			filterCB(`{ respus > ${Number(value) * 1000} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onnetout = (value) => {
		if (numregex.test(value) && Number.isInteger(Number(value))) {
			filterCB(`{ netout > ${Number(value) * 1024} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onSvcname = (value) => {
		filterCB(`{ svcname like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	


	const onApp = (value) => {
		filterCB(`{ app like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onUser = (value) => {
		filterCB(`{ user like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onHost = (value) => {
		filterCB(`{ host ~ ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	


	return (
	<>	

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Request API Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onReq} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Requests with Errors </strong></i></span>
	</div>
	<div style={{ width : 220, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onError} size='small' >Set Filter</Button>
	</div>
	</div>
	</>


	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Response Time in msec greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Response msec" allowClear onSearch={onResponse} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Response Outbound Bytes in KB greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="Outbound Bytes in KB " allowClear onSearch={onnetout} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Service Name Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onSvcname} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>


	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Client Application String Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onApp} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Login Username Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onUser} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	{useHostFields === true && 
		<>
		<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
		<div>
		<span style={{ fontSize : 14, marginRight : 30 }}><i><strong>Hostname of Traced Service Like </strong></i></span>
		</div>
		<div>
		<Search placeholder="Regex like" allowClear onSearch={onHost} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
		</div>
		</div>
		</>}

	</>
	);
}	

export function TracereqMultiQuickFilter({filterCB, useHostFields = true, isext = false, linktext, quicklinktext})
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
			title : <Title level={4}>Trace Request Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={isext ? [...tracereqfields, ...exttracefields] : tracereqfields} useHostFields={useHostFields} 
					title='Trace Request Advanced Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, isext, useHostFields, onFilterCB]);	

	const quickfilter = useCallback(() => {
		objref.current.modal = Modal.info({
			title : <Title level={4}>Trace Request Quick Filters</Title>,

			content : <TracereqQuickFilters filterCB={onFilterCB} useHostFields={useHostFields} />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, useHostFields, onFilterCB]);

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

export function TracereqAggrMultiFilter({filterCB, isext, linktext})
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
			title : <Title level={4}>Trace Request Aggregation Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={[...aggrtracereqfields, ...hostfields]} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return <Button onClick={multifilters} >{linktext ?? "Optional Post Aggregation Filters"}</Button>;	
}


export function TracestatusMultiFilter({filterCB, useHostFields = true, linktext, quicklinktext})
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
			title : <Title level={4}>Trace Request Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={tracestatusfields} useHostFields={useHostFields} 
					title='Trace Status Advanced Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, useHostFields, onFilterCB]);	

	return (
		<>
		<Button onClick={multifilters} >{linktext ?? "Advanced Filters"}</Button>
		</>
	);	
}	

export function TracestatusAggrFilter({filterCB, linktext})
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
			title : <Title level={4}>Trace Status Aggregation Filters</Title>,
			content : <MultiFilters filterCB={onFilterCB} filterfields={aggrtracestatusfields} title='Trace Status Aggregation Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return <Button onClick={multifilters} >{linktext ?? "Optional Post Aggregation Filters"}</Button>;	
}	


export function viewTracedef(record, modal = true)
{
	if (modal) {
		Modal.info({
			title : <Title level={4}><em>Trace Definition '{strTruncateTo(record.alertname, 32)}'</em></Title>,
			content : (
				<JSONDescription jsondata={record} titlestr="Trace Definition" column={1} fieldCols={tracedeffields} />
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
			okText : 'Close', 
		});
	}
	else {
		return <JSONDescription jsondata={record} titlestr="Trace Definition" column={1} fieldCols={tracedeffields} />;
	}	
}

export function TracedefSearch({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, title, tabKey})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.tracedef,
			method	: 'post',
			data : {
				qrytime		: Date.now(),
				timeoutsec 	: 30,
				options 	: {
					filter	: filter,
					maxrecs	: maxrecs,
				},	
			},
			timeout : 30000,
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);

			if ((safetypeof(apidata) !== 'array') || (safetypeof(apidata[0]) !== 'object')) {
				throw new Error("Invalid Data Format seen");
			}	

			return apidata[0];
		};

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		}
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Trace Definition Table", 
						description : `Exception occured while waiting for Trace Definition Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Trace Definition Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs]);

	if (isloading === false && isapierror === false) { 
		const			field = "tracedef";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No Trace Definition found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {

			let		columns;

			columns = getTracedefColumns(typeof tableOnRow !== 'function' ? viewTracedef : undefined);

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>List of Trace Definitions</Title>
				<GyTable columns={columns} dataSource={data.tracedef} rowKey="defid" onRow={tableOnRow} />
				
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


export function tracedefTableTab({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title, extraComp = null})
{
	if (!modal) {
		const			tabKey = `Tracedef_${Date.now()}`;

		CreateTab(title ?? "Tracedef", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<TracedefSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} title={title} /> 
					</>
				);		
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Trace Definitions",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<TracedefSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						title={title} />
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


export function TraceStatusPage({starttime, endtime, addTabCB, remTabCB, isActiveTabCB})
{
	const [{tstart, tend}, setTimes]	= useState({ 
							tstart : starttime ? moment(starttime, moment.ISO_8601) : moment().subtract(10, 'seconds'),  
							tend : endtime ? moment(endtime, moment.ISO_8601) : moment(),  
						});

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

		const			tabKey = `Tracestatus_${Date.now()}`;
		
		CreateTab('Trace Status', 
			() => { return <TraceStatusPage starttime={tstarttime} endtime={tendtime}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [addTabCB, remTabCB, isActiveTabCB]);	
	
	const optionDiv = () => {
		return (
			<div style={{ marginLeft: 30, marginRight: 30, marginBottom : 30, marginTop : 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', 
						border: '1px groove #7a7aa0', padding : 10 }} >

			<div>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			{!starttime && <Button onClick={() => setTimes({tstart : moment().subtract(5, 'seconds'), tend : moment()})} >Refresh Trace Status</Button>}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Trace Status Activity'
					showTime={true} showRange={true} minAggrRangeMin={1} alwaysShowAggrType={true} disableFuture={true} />
			</Space>
			</div>

			</div>
		);
	};	

	return (
		<>
		<Title level={4}><em>{starttime ? 'Historical ' : ''}Trace Status Activity</em></Title>
		{optionDiv()}
		
		<TracestatusSearch starttime={tstart.format()} endtime={tend.format()}
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				
		<div style={{ marginTop: 40, marginBottom: 40 }} />

		<TracehistorySearch addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
		</>		
	);
}

export function traceMonitorTab({svcid, svcname, parid, autoRefresh, refreshSec, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, extraComp = null, ...props})
{
	const				tabKey = `Trace ${svcname ?? ''} ${autoRefresh ? svcid : Date.now()}..`;

	CreateTab(`Trace ${svcname ?? ''} ${svcid.slice(0, 5)}..`, 
		() => {
		return (
			<>
			{typeof extraComp === 'function' ? extraComp() : extraComp}
			<TraceMonitor {...props} svcid={svcid} svcname={svcname} parid={parid} autoRefresh={autoRefresh} refreshSec={refreshSec} 
					starttime={starttime} endtime={endtime} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
			</>		
		);
		}, tabKey, addTabCB);
}


export function TraceMonitor({svcid, svcname, parid, autoRefresh, refreshSec = 30, starttime, endtime, maxrecs, addTabCB, remTabCB, isActiveTabCB, tabKey, ...props})
{
	const 				objref = useRef({ tracePauseUpdate : false, netPauseUpdate : false, svcMonPauseUpdate : false, pauseRefresh : false,
								isPauseRefresh : false, refreshSec : refreshSec, tracestatus : null, svcstart : null, svcaggrsec : 0, 
								nextfetchtime : Date.now(), svcfilter : `{ svcid = '${svcid}' }`, 
								laststarttime : starttime, lastendtime : endtime, lastAutoRefresh : autoRefresh, 
								svcinfo : null,});
	
	const				[{tstart, tend, svckey, currmax, offset}, setstate] = useState(
								{ 
									tstart : (autoRefresh || !starttime) ? moment().subtract(5, 'minutes') : moment(starttime, moment.ISO_8601),
									tend : (autoRefresh || !endtime) ? moment() : moment(endtime, moment.ISO_8601),
									svckey : 1,
									currmax : maxrecs ?? 10000, 
									offset : 0,
								});
	const				[isPauseRefresh, pauseRefresh] = useState(false);
	const				[filterStr, setFilterStr] = useState();
	const 				[nrows, setnrows] = useState(0);
	const				[, setForceUpdate] = useState(false);

	useEffect(() => {
		console.log(`Trace Monitor initial Effect called...`);

		return () => {
			console.log(`Trace Monitor destructor called...`);
		};	
	}, []);

	const validProps = useMemo(() => {	

		if (!svcid) {
			throw new Error(`Mandatory prop parameter svcid not specified`);
		}	

		if (!parid) {
			throw new Error(`Mandatory prop parameter parid not specified`);
		}	

		if (autoRefresh) {
			objref.current.refreshSec = refreshSec;

			if (objref.current.refreshSec < 30) {
				objref.current.refreshSec = 30;
			}	
		}

		objref.current.nextfetchtime = Date.now() + refreshSec * 1000;

		objref.current.svcfilter = `{ svcid = '${svcid}' }`;

		if (addTabCB && typeof addTabCB !== 'function') {
			throw new Error(`Invalid addTabCB prop specified`);
		}	

		if (remTabCB && typeof remTabCB !== 'function') {
			throw new Error(`Invalid remTabCB prop specified`);
		}	

		if (isActiveTabCB && ((typeof isActiveTabCB !== 'function') || (typeof tabKey !== 'string'))) {
			throw new Error(`Invalid tab properties specified : tabkey or Active Tab Callback not specified`);	
		}	
		
		return true;

	}, [objref, svcid, parid, autoRefresh, refreshSec, addTabCB, remTabCB, isActiveTabCB, tabKey]);	

	if (validProps === false) {
		throw new Error(`Internal Error : Service Trace Dashboard validProps check failed`);
	}	

	useEffect(() => {
		if (autoRefresh) {
			return;
		}	

		if (objref.current.lastAutoRefresh === autoRefresh && objref.current.laststarttime === starttime && objref.current.lastendtime === endtime) {
			return;
		}	

		objref.current.nextfetchtime = Date.now() + 1000;
		
		setstate((prev) => { 
			return {
				...prev,
				tstart : (autoRefresh || !starttime) ? moment().subtract(1, 'minutes') : moment(starttime, moment.ISO_8601),
				tend : (autoRefresh || !endtime) ? moment() : moment(endtime, moment.ISO_8601),
				svckey : prev.svckey + 1, // Force SvcMonitor to remount
			};	
		});		
	}, [autoRefresh, starttime, endtime, objref, setstate]);

	useEffect(() => {
		console.log(`isPauseRefresh Changes seen : isPauseRefresh = ${isPauseRefresh}`);

		objref.current.isPauseRefresh = isPauseRefresh;
		objref.current.pauseRefresh = isPauseRefresh;
	}, [isPauseRefresh, objref]);

	useEffect(() => {
		if (!autoRefresh) {
			return;
		}

		console.log('Filter Changes seen : Current Filter is ', filterStr);

		objref.current.nextfetchtime = Date.now() + 1000;
		objref.current.pauseRefresh = false;

	}, [objref, autoRefresh, filterStr]);

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(function apiCall() {
			try {
				let		currtime = Date.now();
				let		compause = (objref.current.tracePauseUpdate || objref.current.netPauseUpdate || objref.current.svcMonPauseUpdate);

				const		oldpause = objref.current.pauseRefresh;

				if (isActiveTabCB && tabKey) {
					objref.current.pauseRefresh = !isActiveTabCB(tabKey);
				}

				if (objref.current.isPauseRefresh === true) {
					objref.current.pauseRefresh = true;
				}	

				if (compause) {
					objref.current.pauseRefresh = true;
				}	

				if (true === objref.current.pauseRefresh || currtime < objref.current.nextfetchtime) {
					if (oldpause === false && objref.current.pauseRefresh) {
						setForceUpdate(val => !val);
					}	

					return;
				}

				if (!autoRefresh) {
					objref.current.nextfetchtime = 0;
					return;
				}	

				objref.current.nextfetchtime = Date.now() + objref.current.refreshSec * 1000;

				setstate(prev => ({
							...prev,
							tstart : moment().subtract(1, 'minute'),
							tend : moment(),
							svckey : prev.svckey + 1,
							offset : 0,
						}));	
			}
			catch(e) {
				notification.error({message : "Trace Dashboard Error", 
						description : `Exception occured : ${e.message}`});

				console.log(`Exception caught in Trace effect : ${e}\n${e.stack}\n`);

				if (objref.current.nerrorretries++ < 5) {
					objref.current.nextfetchtime = Date.now() + 10000;
				}
				else {
					objref.current.nextfetchtime = Date.now() + 60000;
				}	
			}	
			finally {
				timer1 = setTimeout(apiCall, 500);
			}
		}, 1000);

		return () => { 
			console.log(`Destructor called for Trace interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, autoRefresh, isActiveTabCB, tabKey, setstate, setForceUpdate]);	
	
	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		isact = true;

				if (true === objref.current.pauseRefresh) {
					if (objref.current.svcinfo) {
						return;
					}	
				}

				if (tabKey && typeof isActiveTabCB === 'function') {
					isact = isActiveTabCB(tabKey);
				}

				if (false === isact) {
					if (objref.current.svcinfo) {
						return;
					}	
				}	

				const conf = 
				{
					url 	: NodeApis.svcinfo,
					method	: 'post',
					data : {
						parid 			: parid,
						options : {
							filter		: `{ svcid = '${svcid}' }`,
						},	
					},
					timeout 	: 10000,
				};

				console.log(`Fetching next interval svcinfo data...`);

				let 		res = await axios(conf);

				validateApi(res.data);

				if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && (safetypeof(res.data[0].svcinfo) === 'array')) { 
					const				stat = res.data[0].svcinfo[0];

					if (safetypeof(stat) === 'object' && stat.name) {
						objref.current.svcinfo = {
							name : stat.name,
							ip : stat.ip,
							port : stat.port,
							tstart : stat.tstart,
							region : stat.region,
							zone : stat.zone,
							host : res.data[0].hostinfo?.host,
							cluster : res.data[0].hostinfo?.cluster,
						};	
					}	
				}
				else {
					notification.warning({message : "Service Info Format", description : "No Data or Invalid Data for Service Info query..."});
				}	
			}
			catch(e) {
				notification.error({message : "Service Info Data Fetch Exception Error", 
							description : `Exception occured while waiting for new Service Info data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response of Service Info : ${e}\n${e.stack}\n`);
			}	
			finally {
				// Repeat every 10 min
				timer1 = setTimeout(apiCall, 600000);
			}
		}, 0);

		return () => { 
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, svcid, parid, autoRefresh, tabKey, isActiveTabCB]);	

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		isact = true;

				if (true === objref.current.pauseRefresh) {
					if (objref.current.tracestatus) {
						return;
					}	
				}

				if (tabKey && typeof isActiveTabCB === 'function') {
					isact = isActiveTabCB(tabKey);
				}

				if (false === isact) {
					return;
				}	

				const conf = 
				{
					url 	: NodeApis.tracestatus,
					method	: 'post',
					data : {
						parid 			: parid,
						options : {
							filter		: `{ svcid = '${svcid}' }`,
						},	
					},
					timeout 	: 10000,
				};

				console.log(`Fetching next interval tracestatus data...`);

				let 		res = await axios(conf);

				validateApi(res.data);

				if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && (safetypeof(res.data[0].tracestatus) === 'array')) { 
					const				stat = res.data[0].tracestatus[0];

					if (safetypeof(stat) !== 'object') {
						objref.current.tracestatus = { state : 'Inactive' };
					}	
					else {
						const			oldstat = objref.current.tracestatus;

						objref.current.tracestatus = stat;

						if (!oldstat) {
							setForceUpdate(val => !val);
						}	
					}	
				}
				else {
					notification.warning({message : "Service Trace Status Format", description : "No Data or Invalid Data for Service Trace Status query..."});
				}	
			}
			catch(e) {
				notification.error({message : "Service Trace Status Data Fetch Exception Error", 
							description : `Exception occured while waiting for new Service Trace Status data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response of Service Trace Status : ${e}\n${e.stack}\n`);
			}	
			finally {
				// Repeat every 60 sec
				timer1 = setTimeout(apiCall, 60000);
			}
		}, 0);

		return () => { 
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, svcid, parid, autoRefresh, tabKey, isActiveTabCB, setForceUpdate]);	
	
	const tracePauseUpdate = useCallback(val => {
		objref.current.tracePauseUpdate = val;
	}, [objref]);

	const netPauseUpdate = useCallback(val => {
		objref.current.netPauseUpdate = val;
	}, [objref]);

	const svcMonPauseUpdate = useCallback(val => {
		objref.current.svcMonPauseUpdate = val;
	}, [objref]);

	const dataRowsCb = useCallback(val => setnrows(Number(val)), [setnrows]);

	const tracereq = useMemo(() => {
		
		let			fstr;

		if (!filterStr) {
			fstr = objref.current.svcfilter;
		}	
		else {
			fstr = `( ${objref.current.svcfilter} and ${filterStr} )`
		}	

		return (
			<TracereqSearch {...props} parid={parid} filter={fstr} starttime={tstart.format()} endtime={tend.format()} maxrecs={currmax} recoffset={offset}
				dataRowsCb={dataRowsCb} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isext={true} tabKey={tabKey} 
				iscontainer={true} pauseUpdateCb={tracePauseUpdate} />
		);

	}, [parid, objref, props, tstart, tend, filterStr, currmax, offset, dataRowsCb, addTabCB, remTabCB, isActiveTabCB, tabKey, tracePauseUpdate]);

	const tracenet = useMemo(() => {

		return <NetDashboard {...props} svcid={svcid} svcname={svcname} parid={parid} autoRefresh={false} starttime={tstart.format()} endtime={tend.format()}
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} iscontainer={true} pauseUpdateCb={netPauseUpdate} />

	}, [svcid, parid, svcname, props, tstart, tend, addTabCB, remTabCB, isActiveTabCB, tabKey, netPauseUpdate]);

	const tracesvc = useMemo(() => {
		let			st;

		if (tend.unix() - tstart.unix() < 300) {
			st = moment(tend.format(), moment.ISO_8601).subtract(5, 'minute');
		}	
		else {
			st = tstart;
		}	

		if (!autoRefresh && tend.unix() > tstart.unix() + 1800) {
			objref.current.svcaggrsec = 60;
		}	
		else {
			objref.current.svcaggrsec = 0;
		}	

		return <SvcMonitor {...props} svcid={svcid} svcname={svcname} parid={parid} key={svckey} starttime={st.format()} endtime={tend.format()} isRealTime={false}
				aggregatesec={objref.current.svcaggrsec} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
				iscontainer={true} pauseUpdateCb={svcMonPauseUpdate} />

	}, [svcid, parid, svcname, svckey, objref, props, autoRefresh, tstart, tend, addTabCB, remTabCB, isActiveTabCB, tabKey, svcMonPauseUpdate]);


	const onHistorical = useCallback((date, dateString) => {
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

		traceMonitorTab( { svcid, svcname, parid, autoRefresh : false, starttime : tstarttime, endtime : tendtime, maxrecs, 
					addTabCB, remTabCB, isActiveTabCB } );

	}, [parid, svcid, svcname, maxrecs, addTabCB, remTabCB, isActiveTabCB]);	


	const onNewAutoRefresh = useCallback(() => {
		traceMonitorTab( { svcid, svcname, parid, autoRefresh : true, maxrecs, addTabCB, remTabCB, isActiveTabCB } );
	}, [parid, svcid, svcname, maxrecs, addTabCB, remTabCB, isActiveTabCB]);	


	const onTraceSearch = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs, aggrfilter, aggrOutput) => {
		if (!date || !dateString) {
			return;
		}

		let			tstarttime, tendtime, fstr;

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

		if (newfilter) {
			fstr = `( { svcid = '${svcid}' } and ${newfilter} )`; 
		}	
		else {
			fstr = `{ svcid = '${svcid}' }`;
		}	

		// Now close the search modal
		Modal.destroyAll();

		tracereqTableTab({starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, aggrOutput,
					filter : fstr, aggrfilter, maxrecs, isext : true, 
					titlestr : !aggrOutput ? `${useAggr ? 'Aggregated' : ''} Trace Requests for service ${svcname}` : undefined, 
					addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [svcid, svcname, addTabCB, remTabCB, isActiveTabCB]);	


	const onFilterCB = useCallback((newfilter) => {
		objref.current.nextfetchtime = Date.now() + 1000;
		setFilterStr(newfilter);
	}, [objref]);	

	const onResetFilters = useCallback(() => {
		objref.current.nextfetchtime = Date.now() + 1000;
		setFilterStr();
	}, [objref]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range'
				initStart={true} showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <TracereqMultiQuickFilter filterCB={onfiltercb} />;
	}, []);	

	const aggrfiltercb = useCallback((onfiltercb) => {
		return <TracereqAggrMultiFilter filterCB={onfiltercb} isext={true} />;
	}, []);	


	const optionDiv = (width) => {
		return (
			<div style={{ margin: 30, width: width, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', 
						border: '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			{!filterStr && autoRefresh && (
			<Popover title='Apply Trace Request Filters' content=<TracereqMultiQuickFilter filterCB={onFilterCB} /> >
			<Button>Apply Auto Refresh Request Filters</Button>
			</Popover>
			)}

			{filterStr && autoRefresh && (
			<Popover title='Filters Active' content=<Tag color='cyan'>{filterStr}</Tag>>
			<Button onClick={onResetFilters}>Reset All Filters</Button>
			</Popover>
			)}

			<ButtonModal buttontext='Search Service Trace Requests' width={1200} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onTraceSearch} title='Search Service Trace Requests' 
						timecompcb={timecb} filtercompcb={filtercb}  aggrfiltercb={aggrfiltercb} aggrOutputArr={traceAggrOutputArr}
						ismaxrecs={true} defaultmaxrecs={10000} maxallowedrecs={500000} />
				)} />
					

			</Space>
			</div>


			<div style={{ marginLeft : 20 }}>
			<Space>
			{autoRefresh && (isPauseRefresh === false && !objref.current.pauseRefresh) && (<Button onClick={() => {pauseRefresh(true)}}>Pause Auto Refresh</Button>)}
			{autoRefresh && (isPauseRefresh === true || objref.current.pauseRefresh === true) && (<Button onClick={() => {
					objref.current.nextfetchtime = Date.now() + 1000; 
					objref.current.tracePauseUpdate = false;
					objref.current.netPauseUpdate = false;
					objref.current.svcMonPauseUpdate = false;

					pauseRefresh(false);
				}
			}>Resume Auto Refresh</Button>)}

			{!autoRefresh && (<Button onClick={onNewAutoRefresh}>Start Auto Refreshed Dashboard</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Trace Data'
					showTime={false} showRange={true} minAggrRangeMin={0} maxAggrRangeMin={0} disableFuture={true} />
			</Space>
			</div>

			</div>
		);
	};	

	const statusDiv = () => {
		const			svcinfo = objref.current.svcinfo, tracestatus = objref.current.tracestatus;
		
		return (
		<>
		<div style={{ padding : 30 }} >
		<Descriptions bordered={true} column={{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }} >
			{svcinfo && 
				<Descriptions.Item label={<em>Service Name</em>}>
					<Button type='dashed' onClick={() => getSvcInfo(svcid, parid, tstart ? tstart.format() : undefined, undefined, addTabCB, remTabCB, isActiveTabCB)} >
						{svcinfo.name}
					</Button>
				</Descriptions.Item>}
			{tracestatus && <Descriptions.Item label={<em>Trace Status</em>}>{TraceStateBadge(tracestatus.state)}</Descriptions.Item>}
			{svcinfo && <Descriptions.Item label={<em>Listener Port</em>}>{svcinfo.port}</Descriptions.Item>}		
			{tracestatus && tracestatus.state === 'Active' && <Descriptions.Item label={<em>Network Protocol</em>}>{tracestatus.proto}</Descriptions.Item>}
			{svcinfo && <Descriptions.Item label={<em>Host Name</em>}>
				<Button type='dashed' onClick={() => getHostInfo(parid, undefined, addTabCB, remTabCB, isActiveTabCB)} >
					{svcinfo.host}
				</Button>
			</Descriptions.Item>}
			{svcinfo && <Descriptions.Item label={<em>Cluster</em>}>{svcinfo.cluster}</Descriptions.Item>}
			{tracestatus && <Descriptions.Item label={<em>Trace Start Time</em>}>{timeDiffString(tracestatus.tstart)}</Descriptions.Item>}
			{tracestatus && <Descriptions.Item label={<em>TLS Encrypted?</em>}>
				{(tracestatus.istls === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : 'No')}
				</Descriptions.Item>}
		</Descriptions>
		</div>
		</>
		);
	};	

	let 			recelem = null;

	if (nrows > 0 && currmax > 0) {
		recelem = (
			<div style={{ border: '1px dotted #7a7aa0', padding : 10, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap'}} >
			<>		
			<div style={{ borderRight : '1px dotted #7a7aa0', paddingRight : 30 }} >
			<NumButton max={500000} min={1} defaultValue={currmax} okText='Set Max Records to fetch' 				
							onCB={(newval) => setstate(prevstate => ({...prevstate, currmax : newval}))} />
			</div>				
			<Button onClick={() => setstate(prevstate => ({...prevstate, offset : offset - currmax}))} 
							disabled={offset < currmax}>Get Previous {currmax} records within same time range</Button>
			<span>Record Range Returned : {offset + 1} to {nrows + offset}</span>
			<Button onClick={() => setstate(prevstate => ({...prevstate, offset : offset + currmax}))}
							disabled={nrows < currmax}>Get Next {currmax} records within same time range</Button>
			</>
			</div>
		);
	}	

	let			hdrtag = null;

	if (autoRefresh && false === objref.current.pauseRefresh && false === isPauseRefresh) {
		hdrtag = (
			<>
			<Tag color='green'>Running with Auto Refresh every {refreshSec} sec</Tag>
			{filterStr && <Tag color='cyan'>Filters Set</Tag>}
			</>);
	}
	else if (autoRefresh) {
		hdrtag = (
			<>
			<Tag color='green'>Running with Auto Refresh every {refreshSec} sec</Tag>
			<Tag color='blue'>Auto Refresh Paused</Tag>
			{filterStr && <Tag color='cyan'>Filters Set</Tag>}
			</>);

	}	
	else {
		hdrtag = <Tag color='blue'>Auto Refresh Paused</Tag>;
	}	

	return (
		<>
		<Title level={4}><em>Request Trace API Monitor</em></Title>
		{hdrtag}

		<ErrorBoundary>

		{optionDiv()}
		{statusDiv()}

		<div style={{ padding : 30 }} >

		{tracereq}
		{recelem}

		</div>
		
		{tracenet}
		
		<div style={{ marginTop : 40 }} />
		{tracesvc}

		</ErrorBoundary>

		</>
	);
}

