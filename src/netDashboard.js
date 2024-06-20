
import 			React, {useState, useRef, useEffect, useCallback} from 'react';

import 			moment from 'moment';
import 			axios from 'axios';

import 			{Button, Space, Descriptions, Modal, Typography, Empty, Popover, Tag, Alert, notification, message} from 'antd';
import 			{CaretUpFilled, CaretDownFilled, CheckSquareTwoTone, CloseOutlined, PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';

import 			{format} from "d3-format";
import 			ReactFlow, { ReactFlowProvider, isNode } from 'react-flow-renderer';

import 			{NodeApis} from './components/common.js';
import			{ProcInfoDesc} from './procDashboard.js';
import			{SvcInfoDesc} from './svcDashboard.js';
import			{HostInfoDesc} from './hostViewPage.js';
import 			{safetypeof, NullID, validateApi, bytesStrFormat, splitInArray, gyMax, ComponentLife, CreateLinkTab, CreateTab, 
			ButtonJSONDescribe, mergeMultiMadhava, useFetchApi, LoadingAlert, capitalFirstLetter, JSONDescription, strTruncateTo,
			getMinEndtime, msecStrFormat, timeDiffString, getLocalTime} from './components/util.js';
import 			{GyTable, getTableScroll} from './components/gyTable.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';
import 			{MultiFilters, getInrecsField, hostfields} from './multiFilters.js';

const 			{Title} = Typography;
const 			{ErrorBoundary} = Alert;


const			flowBatchSz = 32;
const			netfetchsec = 20;
const			fixedNodeWidth = 130, fixedNodeHeight = 40;

const 			connectionLineStyle = { stroke: '#ddd' };
const			edgeStyle = { cursor: 'pointer' };
const			svcNodeColor = '#e8cacadb';
const			procNodeColor = '#c4b280';

export const activeconnfields = [
	{ field : 'svcname',		desc : 'Service Name',			type : 'string',	subsys : 'activeconn',	valid : null, },
	{ field : 'cname',		desc : 'Client Process Name',		type : 'string',	subsys : 'activeconn',	valid : null, },
	{ field : 'cnetout',		desc : 'Bytes sent by Client',		type : 'number',	subsys : 'activeconn',	valid : null, },
	{ field : 'cnetin',		desc : 'Bytes sent to Client',		type : 'number',	subsys : 'activeconn',	valid : null, },
	{ field : 'sdelms',		desc : 'Service Buffer Delays msec',	type : 'number',	subsys : 'activeconn',	valid : null, },
	{ field : 'cdelms',		desc : 'Client Buffer Delays msec',	type : 'number',	subsys : 'activeconn',	valid : null, },
	{ field : 'rttms',		desc : 'Max Round Trip RTT msec',	type : 'number',	subsys : 'activeconn',	valid : null, },
	{ field : 'nconns',		desc : 'Number of Connections',		type : 'number',	subsys : 'activeconn',	valid : null, },
	{ field : 'csvc',		desc : 'Is Client also a Service?',	type : 'boolean',	subsys : 'activeconn',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'activeconn',	valid : null, },
	{ field : 'cprocid',		desc : 'Client Process Gyeeta ID',	type : 'string',	subsys : 'activeconn',	valid : null, },
	{ field : 'cparid',		desc : 'Client Partha Gyeeta ID',	type : 'string',	subsys : 'activeconn',	valid : null, },
	{ field : 'cmadid',		desc : 'Client Partha Madhava ID',	type : 'string',	subsys : 'activeconn',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'activeconn',	valid : null, },
];

export const extactiveconnfields = [
	{ field : 'ip',			desc : 'Listener IP Address',		type : 'string',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'port',		desc : 'Listener Port',			type : 'number',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'tstart',		desc : 'Service Start Time',		type : 'timestamptz',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'cmdline',		desc : 'Service Process Command Line',	type : 'string',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'region',		desc : 'Service Region Name',		type : 'string',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'zone',		desc : 'Service Zone Name',		type : 'string',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'p95resp5d',		desc : 'p95 5 day Response ms',		type : 'number',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'avgresp5d',		desc : 'Avg 5 day Response ms',		type : 'number',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'p95qps',		desc : 'p95 Queries/sec',		type : 'number',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'p95aconn',		desc : 'p95 Active Connections',	type : 'number',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'svcip1',		desc : 'Virtual IP Address 1',		type : 'string',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'svcport1',		desc : 'Virtual Port 1',		type : 'number',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'svcdns',		desc : 'Service Domain Name',		type : 'string',	subsys : 'extactiveconn',	valid : null, },
	{ field : 'svctag',		desc : 'Service Tag Name',		type : 'string',	subsys : 'extactiveconn',	valid : null, },
];


export const clientconnfields = [
	{ field : 'cname',		desc : 'Client Process Name',		type : 'string',	subsys : 'clientconn',	valid : null, },
	{ field : 'svcname',		desc : 'Service Name',			type : 'string',	subsys : 'clientconn',	valid : null, },
	{ field : 'cnetout',		desc : 'Bytes sent by Client',		type : 'number',	subsys : 'clientconn',	valid : null, },
	{ field : 'cnetin',		desc : 'Bytes sent to Client',		type : 'number',	subsys : 'clientconn',	valid : null, },
	{ field : 'nconns',		desc : 'Number of Connections',		type : 'number',	subsys : 'clientconn',	valid : null, },
	{ field : 'csvc',		desc : 'Is Client a Service?',		type : 'boolean',	subsys : 'clientconn',	valid : null, },
	{ field : 'cprocid',		desc : 'Client Process Gyeeta ID',	type : 'string',	subsys : 'clientconn',	valid : null, },
	{ field : 'svcid',		desc : 'Service Gyeeta ID',		type : 'string',	subsys : 'clientconn',	valid : null, },
	{ field : 'sparid',		desc : 'Service Partha ID',		type : 'string',	subsys : 'clientconn',	valid : null, },
	{ field : 'smadid',		desc : 'Service Madhava ID',		type : 'string',	subsys : 'clientconn',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'clientconn',	valid : null, },
];

export const extclientconnfields = [
	{ field : 'tstart',	desc : 'Client Process Start Time',		type : 'timestamptz',	subsys : 'extclientconn',	valid : null, },
	{ field : 'cmdline',	desc : 'Client Process Command Line',		type : 'string',	subsys : 'extclientconn',	valid : null, },
	{ field : 'region',	desc : 'Client Region Name',			type : 'string',	subsys : 'extclientconn',	valid : null, },
	{ field : 'zone',	desc : 'Client Zone Name',			type : 'string',	subsys : 'extclientconn',	valid : null, },
	{ field : 'tag',	desc : 'Client Process Tag Name',		type : 'string',	subsys : 'extclientconn',	valid : null, },
	{ field : 'uid',	desc : 'Client User ID number',			type : 'number',	subsys : 'extclientconn',	valid : null, },
	{ field : 'gid',	desc : 'Client Group ID number',		type : 'number',	subsys : 'extclientconn',	valid : null, },
	{ field : 'nproc',	desc : '# Client Processes',			type : 'number',	subsys : 'extclientconn',	valid : null, },
	{ field : 'p95cpupct',	desc : 'Client p95 Process CPU %',		type : 'number',	subsys : 'extclientconn',	valid : null, },
	{ field : 'p95cpudel',	desc : 'Client p95 CPU Delay msec',		type : 'number',	subsys : 'extclientconn',	valid : null, },
	{ field : 'p95iodel',	desc : 'Client p95 Block IO Delay msec',	type : 'number',	subsys : 'extclientconn',	valid : null, },
];

export function getActiveConnColumns({istime = true, useHostFields, useCliHostFields, isext, aggrType = ''})
{
	const 			colarr = [];

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
		title :		'Service Name',
		key :		'svcname',
		dataIndex :	'svcname',
		gytype : 	'string',
		width : 	120,
		fixed : 	'left',
		render : 	(text, rec) => <Button type="link">{text}</Button>,
	},	
	{
		title :		'Client Name',
		key :		'cname',
		dataIndex :	'cname',
		width : 	120,
		fixed : 	'left',
		gytype :	'string',
		render : 	(text, rec) => <Button type="link">{text}</Button>,
	},	
	{
		title :		aggrType + ' Traffic from Client',
		key :		'cnetout',
		dataIndex :	'cnetout',
		gytype :	'number',
		width : 	140,
		render :	(num) => bytesStrFormat(num),
	},
	{
		title :		aggrType + ' Traffic to Client',
		key :		'cnetin',
		dataIndex :	'cnetin',
		gytype :	'number',
		width : 	140,
		render :	(num) => bytesStrFormat(num),
	},
	{
		title :		aggrType + ' Connections',
		key :		'nconns',
		dataIndex :	'nconns',
		gytype :	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},
	{
		title :		'Max RTT',
		key :		'rttms',
		dataIndex :	'rttms',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num > 0 ? num.toFixed(3) : num),
		responsive : 	['lg'],
	},
	{
		title :		aggrType + ' Svc Buf Delays',
		key :		'sdelms',
		dataIndex :	'sdelms',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num > 0 ? num.toFixed(3) : num),
		responsive : 	['lg'],
	},
	{
		title :		aggrType + ' Client Buf Delays',
		key :		'cdelms',
		dataIndex :	'cdelms',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num > 0 ? num.toFixed(3) : num),
		responsive : 	['lg'],
	},
	{
		title :		'Is Client a Service?',
		key :		'csvc',
		dataIndex :	'csvc',
		gytype :	'boolean',
		width : 	100,
		responsive : 	['lg'],
		render : 	(val) => (val === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'red'}}/>),
	},
	];

	let			extarr = [];

	if (isext) {
		extarr = [
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
				title :		'Service Start Time',
				key :		'tstart',
				dataIndex :	'tstart',
				gytype : 	'string',
				width :		160,
				render : 	(val) => timeDiffString(val),
			},	
			{
				title :		'Service Region Name',
				key :		'region',
				dataIndex :	'region',
				gytype : 	'string',
				responsive : 	['lg'],
				width :		120,
			},	
			{
				title :		'Service Zone Name',
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
				title :		'Service Domain Name',
				key :		'svcdns',
				dataIndex :	'svcdns',
				gytype : 	'string',
				responsive : 	['lg'],
				width :		150,
			},	
			{
				title :		'Service Tag Name',
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
				title :		'Service Command Line',
				key :		'cmdline',
				dataIndex :	'cmdline',
				gytype : 	'string',
				responsive : 	['lg'],
				render :	(val) => strTruncateTo(val, 64),
				width :		200,
			},	
		];
	}	

	let			hostarr = [], clihostarr = [];

	if (useCliHostFields) {
		clihostarr.push({
			title :		'Client Host',
			key :		'clihost',
			dataIndex :	'clihost',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
		});

		clihostarr.push({
			title :		'Client Cluster',
			key :		'clicluster',
			dataIndex :	'clicluster',
			gytype :	'string',
			responsive : 	['lg'],
			width :		150,
		});
	}


	if (useHostFields) {
		hostarr.push({
			title :		'Service Host',
			key :		'host',
			dataIndex :	'host',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'right',
		});

		hostarr.push({
			title :		'Service Cluster',
			key :		'cluster',
			dataIndex :	'cluster',
			gytype :	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'right',
		});
	}

	return  [...colarr, ...tarr, ...clihostarr, ...extarr, ...hostarr];
	
}

function getClientConnColumns({istime = true, useHostFields, useSerHostFields, isext, aggrType = ''})
{
	const 			colarr = [];

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
		title :		'Client Name',
		key :		'cname',
		dataIndex :	'cname',
		width : 	120,
		gytype :	'string',
		fixed : 	'left',
		render : 	(text, rec) => <Button type="link">{text}</Button>,
	},	
	{
		title :		'Service Name',
		key :		'svcname',
		dataIndex :	'svcname',
		gytype : 	'string',
		width : 	120,
		fixed : 	'left',
		render : 	(text, rec) => <Button type="link">{text}</Button>,
	},	
	{
		title :		`${aggrType} Traffic From Client`,
		key :		'cnetout',
		dataIndex :	'cnetout',
		gytype :	'number',
		width :		140,
		render :	(num) => bytesStrFormat(num),
	},
	{
		title :		`${aggrType} Traffic To Client`,
		key :		'cnetin',
		dataIndex :	'cnetin',
		gytype :	'number',
		width :		140,
		render :	(num) => bytesStrFormat(num),
	},
	{
		title :		`${aggrType} Connections`,
		key :		'nconns',
		dataIndex :	'nconns',
		gytype :	'number',
		width :		100,
		render :	(num) => format(",")(num),
	},
	{
		title :		'Is Client a Service?',
		key :		'csvc',
		dataIndex :	'csvc',
		gytype :	'boolean',
		width :		100,
		responsive : 	['lg'],
		render : 	(val) => (val === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'red'}}/>),
	},
	];

	let			extarr = [];

	if (isext) {
		extarr = [
		{
			title :		'Client Command Line',
			key :		'cmdline',
			dataIndex :	'cmdline',
			gytype : 	'string',
			responsive : 	['lg'],
			render :	(val) => strTruncateTo(val, 64),
			width :		200,
		},	
		{
			title :		'Client Start Time',
			key :		'tstart',
			dataIndex :	'tstart',
			gytype : 	'string',
			width :		160,
			render : 	(val) => timeDiffString(val),
		},	
		{
			title :		'Client Region Name',
			key :		'region',
			dataIndex :	'region',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		120,
		},	
		{
			title :		'Client Zone Name',
			key :		'zone',
			dataIndex :	'zone',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		120,
		},	
		{
			title :		'Client Tag Name',
			key :		'tag',
			dataIndex :	'tag',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
		},	
		{
			title :		'Client User ID Number',
			key :		'uid',
			dataIndex :	'uid',
			gytype : 	'number',
			responsive : 	['lg'],
			width :		100,
		},	
		{
			title :		'Client Group ID Number',
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
		];
	}	

	let			hostarr = [], serhostarr = [];

	if (useSerHostFields) {
		serhostarr.push({
			title :		'Service Host',
			key :		'serhost',
			dataIndex :	'serhost',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
		});

		serhostarr.push({
			title :		'Service Cluster',
			key :		'sercluster',
			dataIndex :	'sercluster',
			gytype :	'string',
			responsive : 	['lg'],
			width :		150,
		});
	}

	if (useHostFields) {
		hostarr.push({
			title :		'Client Host',
			key :		'host',
			dataIndex :	'host',
			gytype : 	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'right',
		});

		hostarr.push({
			title :		'Client Cluster',
			key :		'cluster',
			dataIndex :	'cluster',
			gytype :	'string',
			responsive : 	['lg'],
			width :		150,
			fixed : 	'right',
		});
	}

	return [...colarr, ...tarr, ...serhostarr, ...extarr,  ...hostarr];
	
}

export function ActiveConnFilter({isext, filterCB, linktext, useHostFields})
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
			title : <Title level={4}>Service Active Connection Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={isext ? [...activeconnfields, ...extactiveconnfields, getInrecsField('extactiveconn')] : 
							[...activeconnfields, getInrecsField('activeconn')]} useHostFields={useHostFields} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, isext, useHostFields]);	

	return <Button onClick={multifilters} >{linktext ?? "Service Active Connection Filters"}</Button>;	
}

export function ClientConnFilter({isext, filterCB, linktext, useHostFields})
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
			title : <Title level={4}>Client Connection Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={isext ? [...clientconnfields, ...extclientconnfields] : clientconnfields} useHostFields={useHostFields} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, isext, useHostFields]);	

	return <Button onClick={multifilters} >{linktext ?? "Client Connection Filters"}</Button>;	
}

function ExtActiveConnDesc({rec})
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
		{rec.svcip1 && <Descriptions.Item label={<em>Service IP Address 1</em>}>{rec.svcip1}</Descriptions.Item>}
		{rec.svcport1 && <Descriptions.Item label={<em>Service Port 1</em>}>{rec.svcport1}</Descriptions.Item>}
		{rec.svcip2 && <Descriptions.Item label={<em>Service IP Address 2</em>}>{rec.svcip2}</Descriptions.Item>}
		{rec.svcport2 && <Descriptions.Item label={<em>Service Port 2</em>}>{rec.svcport2}</Descriptions.Item>}
		{rec.svcdns && <Descriptions.Item label={<em>Service Domain Name</em>}>{rec.svcdns}</Descriptions.Item>}
		{rec.svctag && <Descriptions.Item label={<em>Service Tag Name</em>}>{rec.svctag}</Descriptions.Item>}

		</Descriptions>

		</ErrorBoundary>
		</>
	);	
}	

function ExtClientConnDesc({rec})
{
	if (safetypeof(rec) !== 'object') {
		return null;
	}	

	return (
		<>
		<ErrorBoundary>

		<Descriptions style={{ textAlign: 'center' }}>
		
		{rec.tstart && <Descriptions.Item label={<em>Client Process Start Time</em>}>{rec.tstart}</Descriptions.Item>}
		{rec.cmdline && <Descriptions.Item label={<em>Process Command Line</em>}>{rec.cmdline}</Descriptions.Item>}
		{rec.region && <Descriptions.Item label={<em>Region Name</em>}>{rec.region}</Descriptions.Item>}
		{rec.zone && <Descriptions.Item label={<em>Zone Name</em>}>{rec.zone}</Descriptions.Item>}
		{rec.p95cpupct !== undefined && <Descriptions.Item label={<em>p95 CPU Utilization</em>}>{rec.p95cpupct} %</Descriptions.Item>}
		{rec.p95cpudel !== undefined && <Descriptions.Item label={<em>p95 CPU Delay</em>}>{format(",")(rec.p95cpudel)} msec</Descriptions.Item>}
		{rec.p95iodel !== undefined && <Descriptions.Item label={<em>p95 Block IO Delay</em>}>{format(",")(rec.p95iodel)} msec</Descriptions.Item>}
		{rec.tag && <Descriptions.Item label={<em>Process Tag Name</em>}>{rec.tag}</Descriptions.Item>}

		</Descriptions>

		</ErrorBoundary>
		</>
	);	
}	

function getProcInfo(procidarr, parid, starttime, modalCount, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile)
{
	Modal.info({
		title : <span><strong>Aggregated Process Info</strong></span>,
		content : (
			<>
			<ComponentLife stateCB={modalCount} />
			{procidarr.map((id, index) => <ProcInfoDesc procid={id} key={index} parid={parid} starttime={starttime} isTabletOrMobile={isTabletOrMobile}
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} /> )}
			</>
			),	
		width : '90%',	
		closable : true,
		destroyOnClose : true,
		maskClosable : true,
	});
}	

function getSvcInfo(svcidarr, parid, starttime, modalCount, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile)
{
	Modal.info({
		title : <span><strong>Service Info</strong></span>,
		content : (
			<>
			<ComponentLife stateCB={modalCount} />
			{svcidarr.map((id, index) => <SvcInfoDesc svcid={id} parid={parid} key={index} starttime={starttime} isTabletOrMobile={isTabletOrMobile} 
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />)}
			</>
			),			
		width : '90%',	
		closable : true,
		destroyOnClose : true,
		maskClosable : true,
	});
}	


export function ActiveConnSearch({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, isext, tabKey,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb, dataObj})
{
	const 			[{ data, isloading, isapierror }, doFetch, fetchDispatch] = useFetchApi(null);
	const			[isrange, setisrange] = useState(false);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		let			mstart, mend;
		const			field = isext ? "extactiveconn" : "activeconn";

		if (starttime || endtime) {

			mstart = moment(starttime, moment.ISO_8601);

			if (endtime) {
				mend = moment(endtime, moment.ISO_8601);

				if (mend.unix() >= mstart.unix() + 10) {
					setisrange(true);
				}
			}
		}
	
		const conf = {
			url 	: isext ? NodeApis.extactiveconn : NodeApis.activeconn,
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

		const addHostInfo = async (mdata) => {
			if (mdata && mdata[field]) {
				const			parset = new Set();

				for (let conn of mdata[field]) {
					parset.add(conn.cparid);
				}

				if (parset.size === 0) {
					return mdata;
				}	

				const			pararr = [];

				for (let par of parset) {
					pararr.push(par);
				}	

				const conf2 = {
					url 	: NodeApis.nodeparthainfo,
					method	: 'post',
					data	: {
						pararr,
					},
					timeout : 10000,
				};	

				try {
					let 		res = await axios(conf2);
				
					if (safetypeof(res.data) === 'object') {
						for (let conn of mdata[field]) {
							const		inf = res.data[conn.cparid];

							if (inf) {
								conn.clihost = inf.host;
								conn.clicluster = inf.cluster;
							}	
						}
					}	
				}
				catch (error) {
					
				}	
			}	
		
			return mdata;
		};

		const xfrmresp = async (apidata) => {

			validateApi(apidata);
					
			const mdata =  mergeMultiMadhava(apidata, field);

			return addHostInfo(mdata);
		};	

		try {
			if (safetypeof(dataObj) === 'array') {
				addHostInfo({ [field] : dataObj}).then((mdata) => fetchDispatch({ type : 'fetch_success', payload : mdata })).catch();
				return;
			}	
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Service Active Connections", 
				description : `Exception occured while waiting for Service Active Connections data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Service Active Connections fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, aggrMin, aggrType, doFetch, fetchDispatch, endtime, madfilterarr, filter, aggrfilter, maxrecs, starttime, useAggr, isext, 
			dataObj, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					const			field = isext ? "extactiveconn" : "activeconn";
				
					dataRowsCb(data[field]?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, isext, dataRowsCb]);	


	if (isloading === false && isapierror === false) { 
		const			field = isext ? "extactiveconn" : "activeconn";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			const svcCB = (name, rec) => {
				if (rec) {
					getSvcInfo([rec.svcid], rec.parid ?? parid, rec.time, undefined, addTabCB, remTabCB, isActiveTabCB, undefined);
				}	
			};	

			const cliCB = (name, rec) => {
				if (rec && rec.cprocid !== NullID) {
					getProcInfo([rec.cprocid], rec.cparid, rec.time, undefined, addTabCB, remTabCB, isActiveTabCB, undefined);
				}	
			};	

			const svcNetCB = (name, rec) => {
				if (rec) {
					const			tabKey = `NetFlow_${Date.now()}`;
					const			tend = getMinEndtime(rec.time ?? starttime, useAggr && aggrMin ? aggrMin : 5, endtime);

					return CreateLinkTab(<span><i>Get Service Network Flows</i></span>, 'Network Flows', 
								() => { return <NetDashboard svcid={rec.svcid} svcname={name} svcsibling={true} parid={rec.parid ?? parid} autoRefresh={false} 
											starttime={rec.time} endtime={tend} useaggregation={useAggr}
											addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										/> }, tabKey, addTabCB);
				}	
			};	

			const cliNetCB = (name, rec) => {
				if (rec && rec.cprocid !== NullID) {
					const			tabKey = `NetFlow_${Date.now()}`;
					const			tend = getMinEndtime(rec.time ?? starttime, useAggr && aggrMin ? aggrMin : 5, endtime);

					return CreateLinkTab(<span><i>Get Client All Network Flows</i></span>, 'Network Flows', 
								() => { return <NetDashboard procid={rec.cprocid} procname={name} parid={rec.cparid} autoRefresh={false} 
											starttime={rec.time} endtime={tend} useaggregation={useAggr}
											addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										/> }, tabKey, addTabCB);
				}	
			};	

			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Service {record.svcname} Active Connection</strong></span>,
									content : (
										<>
										<JSONDescription titlestr="Active Connection Fields" jsondata={record} column={3} 
												fieldCols={isext ? 
												[...hostfields, ...activeconnfields, ...extactiveconnfields, getInrecsField('extactiveconn')] : 
												[...hostfields, ...activeconnfields, getInrecsField('activeconn')]} />
										<div style={{ marginTop : 50 }} />
										<Space>
										<Button type='dashed' onClick={() => svcCB(record.svcname, record)}>Get Service {record.svcname} Info</Button>
										<Button type='dashed' onClick={() => cliCB(record.cname, record)}>Get Client {record.cname} Info</Button>
										{svcNetCB(record.svcname, record)}
										{cliNetCB(record.cname, record)}
										</Space>
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
									title : <span><strong>Service Active Connection</strong></span>,
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

			let		columns, newtitlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				newtitlestr = "Service Active Connection";
				timestr = <span style={{ fontSize : 14 }} > for time range {moment(starttime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')} to {moment(endtime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')}</span>;
			}	
			else if (!isrange) {
				columns = getActiveConnColumns({istime : true, useHostFields : !parid, isext, useCliHostFields : true});

				if (parid) {
					newtitlestr = `Services Active Connections for Host ${hostname}`;
				}	
				else {
					if (!name) {
						newtitlestr = 'Global Service Active Connections';
					}
					else {
						newtitlestr = `${name} Services Active Connections`;
					}	
				}	

				timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format('YYYY-MM-DD HH:mm:ssZ')} </span>;
			}
			else {
				columns = getActiveConnColumns({istime : true, useHostFields : !parid, isext, useCliHostFields : true, aggrType : useAggr && aggrType ? capitalFirstLetter(aggrType) : ''});

				if (parid) {
					newtitlestr = `${useAggr ? 'Aggregated ' : ''} Services Active Connections for Host ${hostname}`;
				}
				else {
					newtitlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : 'Global'} Services Active Connections`;
				}	
				timestr = <span style={{ fontSize : 14 }} > for time range {moment(starttime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')} to {moment(endtime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')}</span>;
			}	

			const 			expandedRowRender = (rec) => <ExtActiveConnDesc rec={rec} />;

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr ?? newtitlestr}</Title>
				{timestr}
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data[field]} 
					expandable={isext && !customTableColumns ? { expandedRowRender } : undefined} rowKey="rowid" scroll={getTableScroll()} />
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

export function activeConnTab({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, isext, modal, title,
					dataObj, madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Service Active Connections Query", description : `Invalid starttime specified for Service Active Connections : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Service Active Connections Query", description : `Invalid endtime specified for Service Active Connections : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Service Active Connections Query", 
						description : `Invalid endtime specified for Service Active Connections : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? ActiveConnSearch;
	let				tabKey;

	const getComp = () => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						isext={isext} tabKey={tabKey} hostname={hostname}  customColumns={customColumns} customTableColumns={customTableColumns} 
						madfilterarr={madfilterarr} titlestr={titlestr} dataObj={dataObj}
						sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={ActiveConnSearch} /> 
					</>
				);	
			};

	if (!modal) {
		tabKey = `ActiveConn_${Date.now()}`;

		CreateTab(title ?? "Service Conns", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Service Connections",

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

export function ClientConnSearch({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, isext, tabKey, 
					dataObj, madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch, fetchDispatch] = useFetchApi(null);
	const			[isrange, setisrange] = useState(false);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		let			mstart, mend;
		const			field = isext ? "extclientconn" : "clientconn";

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
			url 	: isext ? NodeApis.extclientconn : NodeApis.clientconn,
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

		const addHostInfo = async (mdata) => {
			if (mdata && mdata[field]) {
				const			parset = new Set();

				for (let conn of mdata[field]) {
					parset.add(conn.sparid);
				}

				if (parset.size === 0) {
					return mdata;
				}	

				const			pararr = [];

				for (let par of parset) {
					pararr.push(par);
				}	

				const conf2 = {
					url 	: NodeApis.nodeparthainfo,
					method	: 'post',
					data	: {
						pararr,
					},
					timeout : 10000,
				};	

				try {
					let 		res = await axios(conf2);
				
					if (safetypeof(res.data) === 'object') {
						for (let conn of mdata[field]) {
							const		inf = res.data[conn.sparid];

							if (inf) {
								conn.serhost = inf.host;
								conn.sercluster = inf.cluster;
							}	
						}
					}	
				}
				catch (error) {
					
				}	
			}	
		
			return mdata;
		};

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			const mdata =  mergeMultiMadhava(apidata, field);

			return addHostInfo(mdata);
		};	

		try {
			if (safetypeof(dataObj) === 'array') {
				addHostInfo({ [field] : dataObj}).then((mdata) => fetchDispatch({ type : 'fetch_success', payload : mdata })).catch();
				return;
			}	
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Client Connections", 
				description : `Exception occured while waiting for Client Connections data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Client Connections fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [parid, aggrMin, aggrType, doFetch, fetchDispatch, dataObj, endtime, madfilterarr, filter, aggrfilter, maxrecs, starttime, useAggr, isext, 
			customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					const			field = isext ? "extclientconn" : "clientconn";
					
					dataRowsCb(data[field]?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, isext, dataRowsCb]);	


	if (isloading === false && isapierror === false) { 
		const			field = isext ? "extclientconn" : "clientconn";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			const cliCB = (name, rec) => {
				if (rec) {
					getProcInfo([rec.cprocid], rec.parid ?? parid, rec.time, undefined, addTabCB, remTabCB, isActiveTabCB, undefined);
				}	
			};	

			const svcCB = (name, rec) => {
				if (rec && rec.svcid !== NullID) {
					getSvcInfo([rec.svcid], rec.sparid, rec.time, undefined, addTabCB, remTabCB, isActiveTabCB, undefined);
				}	
			};	

			const cliNetCB = (name, rec) => {
				if (rec) {
					const			tabKey = `NetFlow_${Date.now()}`;
					const			tend = getMinEndtime(rec.time ?? starttime, useAggr && aggrMin ? aggrMin : 5, endtime);

					return CreateLinkTab(<span><i>Get Client Network Flows</i></span>, 'Network Flows', 
								() => { return <NetDashboard procid={rec.cprocid} procname={name} parid={rec.parid ?? parid} autoRefresh={false} 
											starttime={rec.time} endtime={tend} useaggregation={useAggr}
											addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										/> }, tabKey, addTabCB);
				}	
			};	

			const svcNetCB = (name, rec) => {
				if (rec && rec.svcid !== NullID) {
					const			tabKey = `NetFlow_${Date.now()}`;
					const			tend = getMinEndtime(rec.time ?? starttime, useAggr && aggrMin ? aggrMin : 5, endtime);

					return CreateLinkTab(<span><i>Get Service All Network Flows</i></span>, 'Network Flows', 
								() => { return <NetDashboard svcid={rec.svcid} svcname={name} svcsibling={true} parid={rec.sparid} autoRefresh={false} 
											starttime={rec.time} endtime={tend} useaggregation={useAggr}
											addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										/> }, tabKey, addTabCB);
				}	
			};	


			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Client {record.cname} Connection</strong></span>,
									content : (
										<>
										<JSONDescription titlestr="Client Connection Fields" jsondata={record} column={3} 
												fieldCols={isext ? 
												[...hostfields, ...clientconnfields, ...extclientconnfields, getInrecsField('extclientconn')] : 
												[...hostfields, ...clientconnfields, getInrecsField('clientconn')]} />
										<div style={{ marginTop : 50 }} />
										<Space>
										<Button type='dashed' onClick={() => cliCB(record.cname, record)}>Get Process {record.cname} Info</Button>
										<Button type='dashed' onClick={() => svcCB(record.svcname, record)}>Get Service {record.svcname} Info</Button>
										{cliNetCB(record.cname, record)}
										{svcNetCB(record.svcname, record)}
										</Space>
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
									title : <span><strong>Client Connection</strong></span>,
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

			let		columns, newtitlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				newtitlestr = "Client Connection";
				timestr = <span style={{ fontSize : 14 }} > for time range {moment(starttime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')} to {moment(endtime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')}</span>;
			}
			else if (!isrange) {
				columns = getClientConnColumns({istime : true, useHostFields : !parid, useSerHostFields : true, isext});

				if (parid) {
					newtitlestr = `Client Connections for Host ${hostname}`;
				}	
				else {
					if (!name) {
						newtitlestr = 'Global Client Connections';
					}
					else {
						newtitlestr = `${name} Client Connections`;
					}	
				}	

				timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format("MMM Do YYYY HH:mm:ss Z")} </span>;
			}
			else {
				columns = getClientConnColumns({istime : true, useHostFields : !parid, useSerHostFields : true, isext, aggrType : useAggr && aggrType ? capitalFirstLetter(aggrType) : ''});

				if (parid) {
					newtitlestr = `${useAggr ? 'Aggregated ' : ''} Client Connections for Host ${hostname}`;
				}
				else {
					newtitlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : 'Global'} Client Connections`;
				}	
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;
			}	

			const 			expandedRowRender = (rec) => <ExtClientConnDesc rec={rec} />;

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr ?? newtitlestr}</Title>
				{timestr}
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data[field]} 
					expandable={isext && !customTableColumns ? { expandedRowRender } : undefined} rowKey="rowid" scroll={getTableScroll()} />
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

export function clientConnTab({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, isext, modal, title,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Client Connections Query", description : `Invalid starttime specified for Client Connections : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Client Connections Query", description : `Invalid endtime specified for Client Connections : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Client Connections Query", 
						description : `Invalid endtime specified for Client Connections : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? ClientConnSearch;
	let				tabKey;

	const getComp = () => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						isext={isext} tabKey={tabKey} hostname={hostname} customColumns={customColumns} customTableColumns={customTableColumns} 
						madfilterarr={madfilterarr} titlestr={titlestr}
						sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={ClientConnSearch} /> 
					</>
				);
			};

	if (!modal) {
		tabKey = `ActiveConn_${Date.now()}`;

		CreateTab(title ?? "Client Conns", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Client Connections",

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

function initSummary(summary)
{
	summary.starttime		= '';
	summary.endtime			= '';

	summary.nhosts			= 0;
	summary.nflows			= 0;
	summary.nconns			= 0;
	summary.totalbytes		= 0;
	summary.ntiers			= 0;
	summary.nupstreamtiers		= 0;
	summary.ndownstreamtiers	= 0;

	summary.nsvc			= 0;
	summary.nclisvc			= 0;
	summary.ncli			= 0;
}	

function getFlowNode(name, key, svcprocmap, procidarr, svcidarr, parid, hostname, tiernum, nodemap, hostmap, flowarr, isunresolved)
{
	const			tier0border = tiernum === 0 ? '2px solid #a83273' : undefined;
	const			nodestyle = { background: svcidarr && svcidarr.length ? svcNodeColor : procNodeColor, color: '#333', 
						border: tier0border, width: fixedNodeWidth, height: fixedNodeHeight, cursor: 'pointer' };
	let			id, node, isset;
	
	node = nodemap.get(key);
	if (node) {
		return node;
	}

	if ((procidarr && procidarr[0] === NullID) || (svcidarr && svcidarr.length === 1 && svcidarr[0] === NullID)) {
		name = 'Unresolved';
		nodestyle.background = '#c4846c';
		id = NullID;
	}	
	else if (svcidarr && svcidarr.length && svcidarr[0] && svcidarr[0].length) {
		id = svcidarr[0];
	}	
	else {
		id = procidarr[0];
	}	

	if (hostname.length === 0 && id !== NullID) {
		const 		thost = hostmap.get(parid);

		if (thost) {
			hostname = thost;
		}	
	}	
	
	node = {
		id : 		id,
		position : 	{ x : 0, y : 0 },
		style :  	nodestyle,
		isHidden : 	false,
		
		data : {
			label: (
				<>
				<strong>{name}</strong>
				</>
			),
			gydata : {
				name 		:	name,
				svcprocmap 	:	svcprocmap,
				procidarr 	:	procidarr,
				svcidarr 	:	svcidarr,
				parid 		:	parid,
				hostname	:	hostname,
				tiernum 	:	tiernum,
				tier0upsvc	:	tiernum > 0,
				tier0downcli	:	tiernum < 0,
				isunresolved	:	isunresolved,

				actconn	:	{
					cnetout	:	0,	// Partial svc net stats pertaining to the conns as per tiers
					cnetin	: 	0,
					nconns	:	0,
					cdelms	:	0,
					sdelms	:	0,
					rttms	:	0,
				},	
				cliconn	:	{
					cnetout	:	0,
					cnetin	: 	0,
					nconns	:	0,
				},	
			},	
		},
	};	

	if (svcidarr) {
		for (let i = 0; i < svcidarr.length; ++i) {
			nodemap.set(svcidarr[i], node);
			isset = true;
		}	
	}

	if (procidarr) {
		for (let i = 0; i < procidarr.length; ++i) {
			nodemap.set(procidarr[i], node);
			isset = true;
		}
	}	

	if (flowarr && isset) {
		flowarr.push(node);
	}

	return node;
}	

// +ve tiernum for upstream services : get outbound conns initiated by the svc
async function netUpstreamSvcConn(svcid, svcname, nodemap, edgemap, hostmap, flowarr, tiernum, parid, starttime, endtime, isaggregated, aggroper)
{
	try {
		let			node, conf, res, clientfilt, svcprocmap, svcidarr, procidarr, hostname = '';

		if (!svcid || !svcname || !parid || !nodemap || !edgemap || !flowarr || (typeof tiernum !== 'number')) {
			console.log("net Upstream svc : Required input params not specified");
			return 0;
		}	
		
		node = nodemap.get(svcid);

		if (node !== undefined) {
			if ((node.data?.gydata.tier0upsvc || svcid === NullID) && (node.data?.gydata.isunresolved === false)) {
				console.log(`net Upstream Svc : svc node already updated for svcname ${svcname}`);
				return 0;
			}	

			// The same node is also a downstream client
			svcprocmap = node.data.gydata.svcprocmap;
			svcidarr = node.data.gydata.svcidarr;
			procidarr = node.data.gydata.procidarr;
			hostname = node.data.gydata.hostname;
		}	
		
		if (!svcprocmap && svcid !== NullID) {
			conf = {
				url 	: NodeApis.svcprocmap,
				method	: 'post',
				data 	: {
					starttime	: starttime,
					endtime		: endtime,
					pointintime	: true,
					timeoutsec 	: 30,
					parid		: parid,
					filter		: `{ svcprocmap.svcidarr substr '${svcid}' }`,
				},
				timeout	: 30000,
			};

			res = await axios(conf);
			
			validateApi(res.data);

			if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && safetypeof(res.data[0].svcprocmap) === 'array') {
				svcprocmap = res.data[0].svcprocmap[0];
				hostname = res.data[0].hostinfo.host;

				if (false === hostmap.has(parid)) {
					hostmap.set(parid, hostname);
				}	

				if (svcprocmap && svcprocmap.procidarr.length && svcprocmap.svcidarr.length) {
					
					procidarr = svcprocmap.procidarr.split(','); 
					svcidarr = svcprocmap.svcidarr.split(',');

					if (!node) {
						node = getFlowNode(svcname, svcid, svcprocmap, procidarr, svcidarr, parid, hostname, tiernum, nodemap, hostmap, flowarr, false);
					}

					node.data.gydata.svcprocmap 	= svcprocmap;
					node.data.gydata.procidarr 	= procidarr;
					node.data.gydata.svcidarr 	= svcidarr;
					node.data.gydata.hostname 	= hostname;
				}	
			}	
		}

		if (node === undefined) {
			if (svcid !== NullID) {
				console.log(`Failed to get svcprocmap for svc ${svcname} : Ignoring tier ${tiernum} client conns`);
			}

			node = getFlowNode(svcname, svcid, null, [], [svcid], parid, hostname, tiernum, nodemap, hostmap, flowarr, true);
		}	

		if (!svcprocmap || !svcidarr || !procidarr) {
			return 0;
		}

		node.data.gydata.tier0upsvc 	= true;
		node.data.gydata.isunresolved	= false;

		clientfilt = `({ clientconn.cprocid in ${splitInArray(svcprocmap.procidarr)} })`;

		conf = {
			url 		: NodeApis.clientconn, 
			method 		: 'post', 
			data 		: { 
				starttime	: starttime,
				endtime		: endtime,
				timeoutsec 	: 100,
				parid		: parid,
				options		: {
					aggregate	: isaggregated,
					aggroper	: aggroper,
					filter		: clientfilt,
					onlyremote	: false,
				},	
			}, 
			timeout 	: 100 * 1000,
		};

		res = await axios(conf);

		validateApi(res.data);

		if (safetypeof(res.data) === 'array' && (res.data.length === 1) && safetypeof(res.data[0].clientconn) === 'array' && res.data[0].clientconn.length) { 
			
			for (let i = 0; i < res.data[0].clientconn.length; ++i) {
				let		edge, id, conn;

				conn = res.data[0].clientconn[i];

				node.data.gydata.cliconn.cnetout += conn.cnetout;
				node.data.gydata.cliconn.cnetin += conn.cnetin;
				node.data.gydata.cliconn.nconns += conn.nconns;

				id = `${conn.cprocid}-${conn.svcid}`;

				edge = edgemap.get(id);

				if (edge && edge.data?.conn) {
					edge.data.cnetout 	+= conn.cnetout;
					edge.data.cnetin	+= conn.cnetin;
					edge.data.nconns	+= conn.nconns;

					continue;
				}	

				conn.cparid	= 	parid;
				
				edge = {
					id	:	id,
					source	:	node.id,
					target	:	undefined,		// Update later
					arrowHeadType :	'arrowclosed',
					style 	:	edgeStyle,
					data	: {
						conn	:	conn,
						tiernum	:	tiernum + 1,
						clinode	: 	node,
						svcnode	:	undefined,	// Update later
						cnetout	:	conn.cnetout,
						cnetin	:	conn.cnetin,
						nconns	:	conn.nconns,
						cdelms	:	0,
						sdelms	:	0,
						rttms	:	0,
					},	
				};

				edgemap.set(id, edge);

				flowarr.push(edge);
			}

			return res.data[0].clientconn.length;
		}

		return 0;
	}
	catch(e) {
		console.log(`Exception caught while waiting for net Upstream Svc fetch response : ${e}\n${e.stack}\n`);
		return 0;
	}	
}	

// -ve tiernum for downstream clients : if client is also a svc get the incoming client conns to that svc
async function netDownstreamProcSvc(procid, procname, isprocsvc, nodemap, edgemap, hostmap, flowarr, tiernum, parid, starttime, endtime, isaggregated, aggroper)
{
	try {
		let			node, conf, res, actfilt, svcprocmap, svcidarr, procidarr, hostname = '';

		if (!procid || !procname || !parid || !nodemap || !edgemap || !flowarr || (typeof tiernum !== 'number')) {
			console.log("net Downstream Proc : Required input params not specified");
			return 0;
		}	

		node = nodemap.get(procid);

		if (node !== undefined) {
			if ((node.data?.gydata.tier0downcli || procid === NullID) && (node.data?.gydata.isunresolved === false)) {
				console.log(`net Downstream proc : node already updated for procid ${procid}`);
				return 0;
			}	

			// The same node is also an upstream svc
			svcprocmap = node.data.gydata.svcprocmap;
			svcidarr = node.data.gydata.svcidarr;
			procidarr = node.data.gydata.procidarr;
			hostname = node.data.gydata.hostname;
		}	
		
		if (!svcprocmap && procid !== NullID && (!node || node.data.gydata.isunresolved)) {
			if (isprocsvc) {
				conf = {
					url 	: NodeApis.svcprocmap,
					method	: 'post',
					data 	: {
						starttime	: starttime,
						endtime		: endtime,
						pointintime	: true,
						timeoutsec 	: 30,
						parid		: parid,
						filter		: `{ svcprocmap.procidarr substr '${procid}' }`,
					},
					timeout	: 30000,
				};

				res = await axios(conf);
				
				validateApi(res.data);

				if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && safetypeof(res.data[0].svcprocmap) === 'array') {
					svcprocmap = res.data[0].svcprocmap[0];
					hostname = res.data[0].hostinfo.host;

					if (false === hostmap.has(parid)) {
						hostmap.set(parid, hostname);
					}	

					if (svcprocmap && svcprocmap.procidarr.length && svcprocmap.svcidarr.length) {

						procidarr = svcprocmap.procidarr.split(','); 
						svcidarr = svcprocmap.svcidarr.split(',');

						if (!node) {
							node = getFlowNode(procname, procid, svcprocmap, procidarr, svcidarr, parid, hostname, tiernum, nodemap, hostmap, flowarr, false);
						}

						node.data.gydata.svcprocmap 	= svcprocmap;
						node.data.gydata.procidarr 	= procidarr;
						node.data.gydata.svcidarr 	= svcidarr;
						node.data.gydata.hostname	= hostname;
					}	
					else if (node) {
						node.data.gydata.isunresolved	= false;
						node.data.gydata.hostname	= hostname;
					}	
				}	
			}
			else {
				hostname = hostmap.get(parid);

				if (!hostname) {
					// Just get the hostname from node server as proc is not a service
					conf = {
						url 	: NodeApis.nodeparthainfo,
						method	: 'post',
						data 	: {
							parid		: parid,
						},
						timeout	: 10000,
					};
				
						

					res = await axios(conf);
					
					if (safetypeof(res.data) === 'object' && safetypeof(res.data[parid]) === 'object') {
						hostname = res.data[parid].host;
		
						if (false === hostmap.has(parid)) {
							hostmap.set(parid, hostname);
						}	
					}	
				}

				if (node && hostname) {
					node.data.gydata.isunresolved	= false;
					node.data.gydata.hostname	= hostname;
				}	
			}	
		}

		if (node === undefined) {
			node = getFlowNode(procname, procid, null, [procid], [], parid, hostname, tiernum, nodemap, hostmap, flowarr, true);
		}	
		else {
			node.data.gydata.tier0downcli 	= true;
			node.data.gydata.isunresolved	= false;
		}

		if (!svcprocmap || !svcidarr || !procidarr) {
			return 0;
		}

		console.log(`Downstream proc ${procname} is also a service. Getting incoming conns to its svc`);

		actfilt = `({ activeconn.svcid in ${splitInArray(svcprocmap.svcidarr)} })`;

		conf = {
			url 		: NodeApis.activeconn, 
			method 		: 'post', 
			data 		: { 
				starttime	: starttime,
				endtime		: endtime,
				timeoutsec 	: 100,
				parid		: parid,
				options		: {
					aggregate	: isaggregated,
					aggroper	: aggroper,
					filter		: actfilt,
				},	
			}, 
			timeout 	: 100 * 1000,
		};

		res = await axios(conf);

		validateApi(res.data);

		if (safetypeof(res.data) === 'array' && (res.data.length === 1) && safetypeof(res.data[0].activeconn) === 'array' && res.data[0].activeconn.length) { 
			
			for (let i = 0; i < res.data[0].activeconn.length; ++i) {
				let		edge, id, conn;

				conn = res.data[0].activeconn[i];

				node.data.gydata.actconn.cnetout += conn.cnetout;
				node.data.gydata.actconn.cnetin += conn.cnetin;
				node.data.gydata.actconn.nconns += conn.nconns;
				node.data.gydata.actconn.cdelms += conn.cdelms;
				node.data.gydata.actconn.sdelms += conn.sdelms;
				node.data.gydata.actconn.rttms = gyMax(node.data.gydata.rttms, conn.rttms);

				id = `${conn.cprocid}-${conn.svcid}`;

				edge = edgemap.get(id);

				if (edge && edge.data?.conn) {
					edge.data.cnetout 	+= conn.cnetout;
					edge.data.cnetin	+= conn.cnetin;
					edge.data.nconns	+= conn.nconns;
					edge.data.cdelms	+= conn.cdelms;
					edge.data.sdelms	+= conn.sdelms;
					edge.data.rttms		= gyMax(edge.data.rttms, conn.rttms);

					continue;
				}	

				conn.sparid	= 	parid;
				
				edge = {
					id	:	id,
					source	:	undefined,		// Update later
					target	:	node.id,
					arrowHeadType :	'arrowclosed',
					style 	:	edgeStyle,
					data	: {
						conn	:	conn,
						tiernum	:	tiernum - 1,
						clinode	: 	undefined,	// Update later
						svcnode	:	node,
						cnetout	:	conn.cnetout,
						cnetin	:	conn.cnetin,
						nconns	:	conn.nconns,
						cdelms	:	conn.cdelms,
						sdelms	:	conn.sdelms,
						rttms	:	conn.rttms,
					},	
				};

				edgemap.set(id, edge);

				flowarr.push(edge);
			}

			return res.data[0].activeconn.length;
		}

		return 0;
	}
	catch(e) {
		console.log(`Exception caught while waiting for net Downstream proc fetch response : ${e}\n${e.stack}\n`);
		return 0;
	}
}

async function getUpstreamFlows(objref, upconns, tiernum, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr)
{
	/*
	 * We batch the flows in batches of flowBatchSz conns
	 */
	let		promarr = [], nflows, total = 0, startnum = 0;

	for (let i = 0; i < upconns.length; ++i) {
		const		conn = upconns[i];

		promarr.push(netUpstreamSvcConn(conn.svcid, conn.svcname, nodemap, edgemap, hostmap, flowarr, tiernum, conn.sparid, starttime, endtime, isaggregated, aggroper));

		if (promarr.length === flowBatchSz) {
			console.log(`Sent ${promarr.length} batched net upstream Tier ${tiernum} flow requests : Waiting for result..`);

			nflows = await Promise.all(promarr);

			for (let n = 0; n < nflows.length; ++n) {
				total += nflows.n;

				console.log(`Upstream Tier ${tiernum} Svc Conn flow for svc ${upconns[startnum + n].svcname} : Fetched ${nflows[n]} flows`);
			}	

			promarr = [];
			startnum = i + 1;
		}	
	}	

	if (promarr.length > 0) {
		console.log(`Sent final ${promarr.length} batched net upstream Tier ${tiernum} flow requests : Waiting for result..`);

		nflows = await Promise.all(promarr);

		for (let n = 0; n < nflows.length; ++n) {
			total += nflows.n;

			console.log(`Upstream Tier ${tiernum} Svc Conn flow for svc ${upconns[startnum + n].svcname} : Fetched ${nflows[n]} flows`);
		}	
	}

	return total;
}	

async function getDownstreamFlows(objref, downconns, tiernum, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr)
{
	/*
	 * We batch the flows in batches of flowBatchSz conns
	 */
	let		promarr = [], nflows, total = 0, startnum = 0;

	for (let i = 0; i < downconns.length; ++i) {
		const		conn = downconns[i];

		promarr.push(netDownstreamProcSvc(conn.cprocid, conn.cname, conn.csvc, nodemap, edgemap, hostmap, flowarr, tiernum, conn.cparid, starttime, endtime, isaggregated, aggroper));

		if (promarr.length === flowBatchSz) {
			console.log(`Sent ${promarr.length} batched net downstream Tier ${tiernum} flow requests : Waiting for result..`);

			nflows = await Promise.all(promarr);

			for (let n = 0; n < nflows.length; ++n) {
				total += nflows[n];

				console.log(`Downstream Tier ${tiernum} Conn flow for proc ${downconns[startnum + n].cname} : Fetched ${nflows[n]} flows`);
			}	

			promarr = [];
			startnum = i + 1;
		}	
	}	

	if (promarr.length > 0) {
		console.log(`Sent final ${promarr.length} batched net downstream Tier ${tiernum} flow requests : Waiting for result..`);

		nflows = await Promise.all(promarr);

		for (let n = 0; n < nflows.length; ++n) {
			total += nflows[n];

			console.log(`Downstream Tier ${tiernum} Conn flow for svc ${downconns[startnum + n].cname} : Fetched ${nflows[n]} flows`);
		}	
	}

	return total;
}

function finalizeFlows(objref, starttime, endtime, maxResolvedUpstream, minResolvedDownstream, nodemap, edgemap, hostmap, flowarr) 
{
	let			elem, numnodes = 0, numedges = 0, nunresupstream = 0, nunresoldownstream = 0;
	let			tempnodearr = [], tierstats = {}, summary = {}, hostset = new Set(), mintier = 1000, maxtier = -1000;

	const updatenodestats = (node) => {
		const		tiernum = node.data.gydata.tiernum;

		if (tierstats[tiernum] === undefined) {
			tierstats[tiernum] = {
				nodearr		: [node],
			}	
		}	
		else {
			tierstats[tiernum].nodearr.push(node);
		}	

		if (mintier > tiernum) {
			mintier = tiernum;
		}	

		if (maxtier < tiernum) {
			maxtier = tiernum;
		}	

		hostset.add(node.data.gydata.parid);
		numnodes++;

		if (node.data.gydata.svcidarr.length > 0) {
			summary.nsvc++;

			if (node.data.gydata.cliconn.nconns > 0) {
				summary.nclisvc++;
			}

			if (node.id !== NullID) {
				node.style.background = svcNodeColor;
			}
		}	

		if (node.data.gydata.cliconn.nconns > 0) {
			summary.ncli++;
		}
	};	

	initSummary(summary);

	for (let i = 0; i < flowarr.length; ++i) {
		elem = flowarr[i];

		if ((elem.source !== undefined) || (elem.target !== undefined)) {
			numedges++;
			
			if (!elem.target) {
				const		conn = elem.data.conn;
				let		node;
				
				node = nodemap.get(conn.svcid);

				if (node === undefined) {
					/*
					 * This is an unresolved node
					 */
					nunresupstream++;

					node = getFlowNode(conn.svcname, conn.svcid, null, [], [conn.svcid], conn.sparid, '', elem.data.tiernum, nodemap, hostmap, tempnodearr, true);
				}	

				elem.target		= node.id;
				elem.data.svcnode	= node;

				node.data.gydata.actconn.cnetout += elem.data.cnetout;
				node.data.gydata.actconn.cnetin += elem.data.cnetin;
				node.data.gydata.actconn.nconns += elem.data.nconns;

			}	
			else if (!elem.source) {
				const		conn = elem.data.conn;
				let		node;
				
				node = nodemap.get(conn.cprocid);

				if (node === undefined) {
					nunresoldownstream++;

					node = getFlowNode(conn.cname, conn.cprocid, null, [conn.cprocid], [], conn.cparid, '', elem.data.tiernum, nodemap, hostmap, tempnodearr, true);
				}	

				elem.source		= node.id;
				elem.data.clinode	= node;

				node.data.gydata.cliconn.cnetout += elem.data.cnetout;
				node.data.gydata.cliconn.cnetin += elem.data.cnetin;
				node.data.gydata.cliconn.nconns += elem.data.nconns;
			}

			summary.nconns 		+= elem.data.nconns;
			summary.totalbytes 	+= elem.data.cnetin + elem.data.cnetout;
		}
		else {
			updatenodestats(elem);
		}	
	}	

	// Now add the tempnodearr entries to flowarr
	for (let node of tempnodearr) {
		flowarr.push(node);
		updatenodestats(node);
	}	

	if (numedges < 200) {
		for (let i = 0; i < flowarr.length; ++i) {
			elem = flowarr[i];

			if (elem.source) {
				elem.label 		= bytesStrFormat(elem.data.cnetout + elem.data.cnetin, 0, 'b');
				elem.labelStyle		= { fill: 'blue', fontWeight: 600 }; 
				// elem.labelBgStyle 	= { opacity: 0.6 };
			}
		}	
	}	

	objref.current.maxResolvedUpstream 	= maxResolvedUpstream;
	objref.current.minResolvedDownstream 	= minResolvedDownstream;

	summary.starttime 	= starttime;
	summary.endtime		= endtime;
	summary.nhosts 		= hostset.size;
	summary.nflows 		= numedges;
	summary.ntiers		= maxtier - mintier + 1;
	summary.nupstreamtiers	= maxtier;
	summary.ndownstreamtiers = -mintier;	

	// Now calculate the x, y co-ordinates of all nodes
	const			fixedFlowWidth = window.innerWidth - 200 < 1500 ? 1500 : window.innerWidth - 200; 
	const			maxRowNodes = numnodes < 20 ? 4 : 5;
	let			xspace, yspace = 80, starty = 80;

	xspace = (fixedFlowWidth - (maxRowNodes * fixedNodeWidth) - 50)/maxRowNodes;

	if (xspace < 80) xspace = 80;

	if (numnodes >= 96) {
		yspace = 60;
	}

	for (let t = mintier; t <= maxtier; ++t) {
		if (!tierstats[t]) {
			continue;
		}	
		
		let		startx, total = tierstats[t].nodearr.length;

		if (total <= 3) {
			startx = 400 + (4 - total) * 100;
		}	
		else if (total <= 5) {
			startx = 200 + (6 - total) * 100;
		}	
		else {
			startx = 80;
		}	

		for (let i = 0; i < total; ++i) {
			const		node = tierstats[t].nodearr[i];
			
			node.position.x = startx;
			node.position.y = starty;
			
			startx += fixedNodeWidth + xspace;

			if (i + 1 < total && startx >= fixedFlowWidth - fixedNodeWidth - 30) {
				startx = 80;
				starty += fixedNodeHeight + yspace;
			}
		}	

		// Add extra space between tiers
		starty += fixedNodeHeight + 2 * yspace;
	}

	objref.current.flowHeight 	= starty + fixedNodeHeight + yspace;
	objref.current.flowWidth	= fixedFlowWidth;
	objref.current.isprocessing 	= false;

	console.log(`Flow Stats : Total ${numnodes} Network Nodes : ${numedges} Edges : Total Flow Height ${objref.current.flowHeight} : mintier ${mintier} maxtier ${maxtier} : `
		+ `Unresolved Upstream Nodes ${nunresupstream} Unresolved Downstream Nodes ${nunresoldownstream} #Hosts ${summary.nhosts} #Total Bytes ${summary.totalbytes} ...`);

	return {flowarr, summary};
}	

async function getNextUpstreamFlows({objref, maxResolvedUpstream, minResolvedDownstream, parid, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr})
{
	try {
		const			upconns = [];

		for (let i = 0; i < flowarr.length; ++i) {
			const		elem = flowarr[i];

			if (elem.source && elem.data.tiernum === maxResolvedUpstream + 1) {
				upconns.push(elem.data.conn);
			}
		}

		if (upconns.length === 0) {
			console.log(`Found 0 Flow edges with Tier === ${maxResolvedUpstream + 1}`);
			return 0;
		}

		console.log(`Fetching ${upconns.length} Upstream Tier ${maxResolvedUpstream + 1} Svcs`); 

		const nup1 = await getUpstreamFlows(objref, upconns, maxResolvedUpstream + 1, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr);

		console.log(`Fetched Total of ${nup1} upstream Tier ${maxResolvedUpstream + 1} flows...`);

		return finalizeFlows(objref, starttime, endtime, maxResolvedUpstream + 1, minResolvedDownstream, nodemap, edgemap, hostmap, flowarr);
	}
	catch(e) {
		console.log(`Exception caught while waiting for net Tier ${maxResolvedUpstream + 1} Upstream Svc fetch response : ${e}\n${e.stack}\n`);
		return 0;
	}	
}	

async function getNextDownstreamFlows({objref, maxResolvedUpstream, minResolvedDownstream, parid, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr})
{
	try {
		const			downconns = [];

		for (let i = 0; i < flowarr.length; ++i) {
			const		elem = flowarr[i];

			if (elem.source && elem.data.tiernum === minResolvedDownstream - 1) {
				downconns.push(elem.data.conn);
			}
		}

		if (downconns.length === 0) {
			console.log(`Found 0 Flow edges with Tier === ${minResolvedDownstream - 1}`);
			return 0;
		}

		console.log(`Fetching ${downconns.length} Downstream Tier ${minResolvedDownstream - 1} Procs`); 

		const ndown1 = await getDownstreamFlows(objref, downconns, minResolvedDownstream - 1, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr);

		console.log(`Fetched Total of ${ndown1} Downstream Tier ${minResolvedDownstream - 1} flows...`);

		return finalizeFlows(objref, starttime, endtime, maxResolvedUpstream, minResolvedDownstream - 1, nodemap, edgemap, hostmap, flowarr);
	}
	catch(e) {
		console.log(`Exception caught while waiting for net Tier ${minResolvedDownstream - 1} Downstream proc fetch response : ${e}\n${e.stack}\n`);
		return 0;
	}	
}	


async function getNetFlows({objref, svcid, svcname, svcsibling, procid, procname, isprocsvc, parid, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr})
{
	const			ishostbased = (!svcid && !procid);

	let			conf, res, clientfilt, actfilt, svcprocmap, currtime = Date.now();

	if (svcid) {
		actfilt = `{ svcid = '${svcid}' }`;
	}	
	else if (procid) {
		clientfilt = `{ cprocid = '${procid}' }`;
	}	

	if (currtime > objref.current.tlastprocmap + 300000) {

		objref.current.tlastprocmap = currtime;

		if ((svcid || (procid && (isprocsvc === true || isprocsvc === undefined))) || ishostbased) {

			conf = {
				url 	: NodeApis.svcprocmap,
				method	: 'post',
				data 	: {
					starttime	: starttime,
					endtime		: endtime,
					pointintime	: true,
					timeoutsec 	: 30,
					parid		: parid,
					filter		: svcid ? `{ svcprocmap.svcidarr substr '${svcid}' }` : procid ? `{ svcprocmap.procidarr substr '${procid}' }` : undefined,
				},
				timeout	: 30000,
			};

			res = await axios(conf);
			
			validateApi(res.data);

			if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && safetypeof(res.data[0].svcprocmap) === 'array') {
				objref.current.svcprocmap = res.data[0].svcprocmap;
				objref.current.hostname = res.data[0].hostinfo.host;
				objref.current.clustername = res.data[0].hostinfo.cluster;

			}	
			else {
				objref.current.svcprocmap = null;

				if (svcid) {
					// Try again next time
					objref.current.tlastprocmap = 0;
				}	
			}	
		}	
	}

	if (svcid && objref.current.svcprocmap && objref.current.svcprocmap[0] && objref.current.svcprocmap[0].procidarr.length) {
		clientfilt = `{ cprocid in ${splitInArray(objref.current.svcprocmap[0].procidarr)} }`;

		if (svcsibling === true) {
			// Get all sibling active conns
			actfilt = `{ svcid in ${splitInArray(objref.current.svcprocmap[0].svcidarr)} }`;
		}	
	}	
	else if (procid && objref.current.svcprocmap && objref.current.svcprocmap[0] && objref.current.svcprocmap[0].svcidarr.length) {
		actfilt = `{ svcid in ${splitInArray(objref.current.svcprocmap[0].svcidarr)} }`;
	}

	svcprocmap = objref.current.svcprocmap;

	let 			multiqueryarr = [];

	conf = {
		url 		: NodeApis.multiquery, 
		method 		: 'post', 
		data 		: { 
			parid 		: parid,
			timeoutsec 	: 100,
			starttime	: starttime,
			endtime		: endtime,
			multiqueryarr	: multiqueryarr, 
		}, 
		timeout 	: 100000,
	};

	// We need to get the combination of Active Conns and Client Conns
	if (svcid || !procid) {
		multiqueryarr.push(
			{
				qid 		: 'activeconn', 
				qname 		: 'activeConn',
				options		: {
					aggregate	: isaggregated,
					aggroper	: aggroper,
					aggrsec		: 10000000,
					filter		: actfilt,
				},	
			}
		);	
		
		if (clientfilt || !svcid) {
			multiqueryarr.push(
				{
					qid 		: 'clientconn', 
					qname 		: 'clientConn',
					options		: {
						aggregate	: isaggregated,
						aggroper	: aggroper,
						aggrsec		: 10000000,
						filter		: clientfilt,
						onlyremote	: false,
					},	
				}
			);	
		}	
	}
	else {
		multiqueryarr.push(
			{
				qid 		: 'clientconn', 
				qname 		: 'clientConn',
				options		: {
					aggregate	: isaggregated,
					aggroper	: aggroper,
					aggrsec		: 10000000,
					filter		: clientfilt,
					onlyremote	: false,
				},	
			}
		);	
		
		if (actfilt) {
			multiqueryarr.push(
				{
					qid 		: 'activeconn', 
					qname 		: 'activeConn',
					options		: {
						aggregate	: isaggregated,
						aggroper	: aggroper,
						aggrsec		: 10000000,
						filter		: actfilt,
					},	
				}
			);	
		}	
	}	

	console.log(`Fetching next interval activeconn/clientconn data...for config ${JSON.stringify(conf)}`);

	res = await axios(conf);

	validateApi(res.data);

	let			tier0cli, tier0act;

	if ((safetypeof(res.data) === 'array') && (res.data.length === 1) && 
		(((safetypeof(res.data[0].clientconn) === 'object') && (safetypeof(res.data[0].clientconn.clientconn) === 'array')) || 
		((safetypeof(res.data[0].activeconn) === 'object') && (safetypeof(res.data[0].activeconn.activeconn) === 'array')))) { 

		tier0cli 	= res.data[0].clientconn?.clientconn;
		tier0act 	= res.data[0].activeconn?.activeconn;

		if (res.data[0].clientconn?.hostinfo) {
			objref.current.hostname = res.data[0].clientconn.hostinfo.host;
			objref.current.clustername = res.data[0].clientconn.hostinfo.cluster;

			hostmap.set(parid, objref.current.hostname);
		}	
	}
	else {
		console.log(`Network Flow Data Format : Invalid Data for Network Flow fetch...`);

		notification.warning({message : "Network Flow Data Format", description : "Invalid Data for Network Flow fetch..."});
		return null;
	}	

	if (!tier0cli) {
		tier0cli = [];
	}	

	if (!tier0act) {
		tier0act = [];
	}	

	objref.current.tier0cli = tier0cli;
	objref.current.tier0act = tier0act;
	
	/*
	 * Now loop through the active conns first and then cliconns so as to create Node Tier 0 entries
	 */
	for (let i = 0; i < tier0act.length; ++i) {
		const		conn = tier0act[i];

		let		node = nodemap.get(conn.svcid);

		if (!node && svcprocmap) {
			// Get the svcprocmap for a new Node entry
			for (let j = 0; j < svcprocmap.length; ++j) {
				const 		smap = svcprocmap[j];

				if (smap.svcidarr.includes(conn.svcid)) {
					const		procidarr = smap.procidarr.split(','), svcidarr = smap.svcidarr.split(',');

					node = getFlowNode(conn.svcname, conn.svcid, smap, procidarr, svcidarr, parid, objref.current.hostname, 0, nodemap, hostmap, flowarr, false);
				}	
			}	
		}

		if (node === undefined) {
			console.log(`Failed to get svcprocmap for svc ${conn.svcname} : Ignoring tier 0 client conns`);

			node = getFlowNode(conn.svcname, conn.svcid, null, [], [conn.svcid], parid, objref.current.hostname, 0, nodemap, hostmap, flowarr, true);
		}	
	}	

	for (let i = 0; i < tier0cli.length; ++i) {
		const		conn = tier0cli[i];

		let		node = nodemap.get(conn.cprocid);

		if (!node && svcprocmap) {
			// Get the svcprocmap for a new Node entry
			for (let j = 0; j < svcprocmap.length; ++j) {
				const 		smap = svcprocmap[j];

				if (smap.procidarr.includes(conn.cprocid)) {
					const		procidarr = smap.procidarr.split(','), svcidarr = smap.svcidarr.split(',');

					node = getFlowNode(conn.cname, conn.cprocid, smap, procidarr, svcidarr, parid, objref.current.hostname, 0, nodemap, hostmap, flowarr, false);
				}	
			}	
		}

		if (node === undefined) {
			node = getFlowNode(conn.cname, conn.cprocid, null, [conn.cprocid], [], parid, objref.current.hostname, 0, nodemap, hostmap, flowarr, false);
		}	
	}	

	let			upconns = [], downconns = [];

	for (let i = 0; i < tier0act.length; ++i) {
		let		edge, id, conn, node, clinode;

		conn = tier0act[i];

		node = nodemap.get(conn.svcid);
		clinode = nodemap.get(conn.cprocid);

		if (!node) {
			continue;	// This should not occur
		}	

		if (!clinode) {
			downconns.push(conn);
		}	

		node.data.gydata.actconn.cnetout += conn.cnetout;
		node.data.gydata.actconn.cnetin += conn.cnetin;
		node.data.gydata.actconn.nconns += conn.nconns;
		node.data.gydata.actconn.cdelms += conn.cdelms;
		node.data.gydata.actconn.sdelms += conn.sdelms;
		node.data.gydata.actconn.rttms = gyMax(node.data.gydata.rttms, conn.rttms);

		id = `${conn.cprocid}-${conn.svcid}`;

		edge = edgemap.get(id);

		if (edge && edge.data?.conn) {
			edge.data.cnetout 	+= conn.cnetout;
			edge.data.cnetin	+= conn.cnetin;
			edge.data.nconns	+= conn.nconns;
			edge.data.cdelms	+= conn.cdelms;
			edge.data.sdelms	+= conn.sdelms;
			edge.data.rttms		= gyMax(edge.data.rttms, conn.rttms);

			continue;
		}	

		conn.sparid	= 	parid;
		
		edge = {
			id	:	id,
			source	:	clinode ? clinode.id : undefined,
			target	:	node.id,
			arrowHeadType :	'arrowclosed',
			style 	:	edgeStyle,
			data	: {
				conn	:	conn,
				tiernum	:	clinode ? 0 : -1,
				clinode	: 	clinode,
				svcnode	:	node,
				cnetout	:	conn.cnetout,
				cnetin	:	conn.cnetin,
				nconns	:	conn.nconns,
				cdelms	:	conn.cdelms,
				sdelms	:	conn.sdelms,
				rttms	:	conn.rttms,
			},	
		};

		edgemap.set(id, edge);

		flowarr.push(edge);
	}

	for (let i = 0; i < tier0cli.length; ++i) {
		let		edge, id, conn, node;

		conn = tier0cli[i];

		upconns.push(conn);

		node = nodemap.get(conn.cprocid);

		if (!node) {
			continue;	// This should not occur
		}	

		node.data.gydata.cliconn.cnetout += conn.cnetout;
		node.data.gydata.cliconn.cnetin += conn.cnetin;
		node.data.gydata.cliconn.nconns += conn.nconns;

		id = `${conn.cprocid}-${conn.svcid}`;

		edge = edgemap.get(id);

		if (edge && edge.data?.conn) {
			edge.data.cnetout 	+= conn.cnetout;
			edge.data.cnetin	+= conn.cnetin;
			edge.data.nconns	+= conn.nconns;

			continue;
		}	

		conn.cparid	= 	parid;
		
		edge = {
			id	:	id,
			source	:	node.id,
			target	:	undefined,	
			arrowHeadType :	'arrowclosed',
			style 	:	edgeStyle,
			data	: {
				conn	:	conn,
				tiernum	:	1,
				clinode	: 	node,
				svcnode	:	undefined,
				cnetout	:	conn.cnetout,
				cnetin	:	conn.cnetin,
				nconns	:	conn.nconns,
			},	
		};

		edgemap.set(id, edge);

		flowarr.push(edge);
	}

	console.log(`Fetching ${upconns.length} Upstream Tier1 Svcs and ${downconns.length} Downstream clients`); 

	const nup1 = await getUpstreamFlows(objref, upconns, 1, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr);

	console.log(`Fetched Total of ${nup1} upstream Tier1 flows : Now sending Downstream queries...`);
	
	const ndown1 = await getDownstreamFlows(objref, downconns, -1, starttime, endtime, isaggregated, aggroper, nodemap, edgemap, hostmap, flowarr);

	console.log(`Fetched Total of ${ndown1} downstream Tier -1 flows...`);

	return finalizeFlows(objref, starttime, endtime, 1, -1, nodemap, edgemap, hostmap, flowarr);
}	

function getHostInfo(parid, modalCount, addTabCB, remTabCB, isActiveTabCB)
{
	Modal.info({
		title : <span><strong>Host Info</strong></span>,
		content : (
			<>
			<ComponentLife stateCB={modalCount} />
			<HostInfoDesc parid={parid} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB}  />
			</>
			),

		width : '90%',	
		closable : true,
		destroyOnClose : true,
		maskClosable : true,
	});
}	

function getNodeNetFlows({node, objref, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const			tabKey = `NetFlow_${Date.now()}`;
	let			svcid, svcname, procid, procname;

	if (node.data.gydata.svcidarr && node.data.gydata.svcidarr.length > 0) {
		svcname = node.data.gydata.name;
		svcid = node.data.gydata.svcidarr[0];
	}	
	else {
		procname = node.data.gydata.name;
		procid = node.data.gydata.procidarr[0];
	}	
	
	return CreateLinkTab(<span><i>Get Network Flows</i></span>, 'Network Flows', 
				() => { return <NetDashboard svcid={svcid} svcname={svcname} svcsibling={true} procid={procid} procname={procname} parid={node.data.gydata.parid} autoRefresh={false} 
							starttime={objref.current.starttime} endtime={objref.current.endtime} useaggregation={objref.current.isaggregated}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
						/> }, tabKey, addTabCB);
}


function FlowNodeDesc({node, objref, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile, showStats = true})
{
	const			gydata = node.data.gydata;
	const			issvc = (gydata.svcidarr && gydata.svcidarr.length > 0);
	let			titlestr = `Statistics for ${issvc ? 'Service' : 'TCP Client'} '${gydata.name}'`;

	if (node.id === NullID) {
		titlestr = `Unresolved ${issvc ? 'Service' : 'TCP Client'} Statistics`;
	}	

	return (
		<Descriptions title={titlestr} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>
		
		{node.id !== NullID && (<Descriptions.Item label={<em>Host</em>}>
						<Button type='dashed' onClick={() => getHostInfo(gydata.parid, undefined, addTabCB, remTabCB, isActiveTabCB)} >{node.data.gydata.hostname}</Button>
					</Descriptions.Item>)	
		}

		{node.id !== NullID && issvc && (
			<Descriptions.Item label={<em>Service Monitor / Info</em>}>
				<Button type='dashed' onClick={() => getSvcInfo(gydata.svcidarr, gydata.parid, objref.current.starttime, undefined, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile)} >
					Get Service Info
				</Button>
			</Descriptions.Item>)	
		}

		{node.id !== NullID && gydata.procidarr.length && (
			<Descriptions.Item label={<em>Process Monitor / Info</em>}>
				<Button type='dashed' onClick={() => getProcInfo(gydata.procidarr, gydata.parid, objref.current.starttime, undefined, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile)} >
					Aggregated Process Info
				</Button>
			</Descriptions.Item>)	
		}


		{node.id !== NullID && (
			<Descriptions.Item label={<em>Get All Network Flows</em>}>
				{getNodeNetFlows({node, objref, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})}
			</Descriptions.Item>)	
		}

		{showStats && issvc && (
			<Descriptions.Item label={<em># Total Connections</em>}>{format(",")(gydata.actconn.nconns + gydata.cliconn.nconns)}</Descriptions.Item>
		)}

		{showStats && issvc && (
			<Descriptions.Item label={<em># Total Inbound Bytes</em>}>{bytesStrFormat(gydata.actconn.cnetout + gydata.cliconn.cnetin)}</Descriptions.Item>
		)}

		{showStats && issvc && (
			<Descriptions.Item label={<em># Total Outbound Bytes</em>}>{bytesStrFormat(gydata.actconn.cnetin + gydata.cliconn.cnetout)}</Descriptions.Item>
		)}

		{showStats && issvc && gydata.actconn.rttms > 0 && (
			<Descriptions.Item label={<em># Max Round Trip RTT</em>}>{format(".3f")(gydata.actconn.rttms)} msec</Descriptions.Item>
		)}

		{showStats && issvc && gydata.actconn.cdelms > 0 && (
			<Descriptions.Item label={<em># Client Buffer Delays</em>}>{format(",")(gydata.actconn.cdelms)} msec</Descriptions.Item>
		)}

		{showStats && issvc && gydata.actconn.sdelms > 0 && (
			<Descriptions.Item label={<em># Server Buffer Delays</em>}>{format(",")(gydata.actconn.sdelms)} msec</Descriptions.Item>
		)}

		{showStats && !issvc && (
			<Descriptions.Item label={<em># Total Connections</em>}>{format(",")(gydata.cliconn.nconns)}</Descriptions.Item>
		)}

		{showStats && !issvc && (
			<Descriptions.Item label={<em># Total Inbound Bytes</em>}>{bytesStrFormat(gydata.cliconn.cnetin)}</Descriptions.Item>
		)}

		{showStats && !issvc && (
			<Descriptions.Item label={<em># Total Outbound Bytes</em>}>{bytesStrFormat(gydata.cliconn.cnetout)}</Descriptions.Item>
		)}

		<Descriptions.Item label={<em>Complete Record</em>}>{ButtonJSONDescribe({record : gydata})}</Descriptions.Item>

		</Descriptions>
	);
	
}	

function FlowEdgeDesc({edge, objref, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const			clinode = edge.data.clinode, svcnode = edge.data.svcnode;
	const			titlestr = `Statistics for Flow from client '${clinode.data.gydata.name}' to service '${svcnode.data.gydata.name}'`;
	const			edata = edge.data;

	return (
		<>
		<div style={{ marginTop: 30, marginBottom: 50, border: '1px groove #d9d9d9' }} >
		<Descriptions title={titlestr} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>
		
		<Descriptions.Item label={<em># Total Connections</em>}>{edata.nconns}</Descriptions.Item>
		<Descriptions.Item label={<em># Flow Bytes</em>}>{bytesStrFormat(edata.cnetout + edata.cnetin)}</Descriptions.Item>
		{edata.rttms > 0 && (
			<Descriptions.Item label={<em># Max Round Trip RTT</em>}>{format(".3f")(edata.rttms)} msec</Descriptions.Item>
		)}

		{edata.cdelms > 0 && (
			<Descriptions.Item label={<em># Client Buffer Delays</em>}>{format(",")(edata.cdelms)} msec</Descriptions.Item>
		)}

		{edata.sdelms > 0 && (
			<Descriptions.Item label={<em># Server Buffer Delays</em>}>{format(",")(edata.sdelms)} msec</Descriptions.Item>
		)}

		</Descriptions>
		</div>

		<div style={{ marginTop: 30, marginBottom: 50, border: '1px groove #d9d9d9' }} >
		<FlowNodeDesc node={clinode} objref={objref} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} showStats={false} />
		</div>
		<div style={{ marginTop: 50, marginBottom: 50, border: '1px groove #d9d9d9' }} >
		<FlowNodeDesc node={svcnode} objref={objref} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isTabletOrMobile={isTabletOrMobile} showStats={false} />
		</div>
		</>
	);
}	

export function NetSummary({objref, summary, addTabCB, remTabCB, isActiveTabCB, tabKey, modalCount, isTabletOrMobile})
{
	if (!summary) {
		throw new Error(`Invalid Data : No summary seen for Net Flow Summary`);
	}	

	let			titlestr, issvc, isproc, ishost;
	const			isaggregated = objref.current.isaggregated;
	const			aggrstr = isaggregated ? 'Aggregated' : '';
	
	if (objref.current.svcid) {
		titlestr = `${aggrstr} Network Flow Summary for service '${objref.current.svcname}' of host '${objref.current.hostname}' and cluster '${objref.current.clustername}'`;
		issvc = true;
	}	
	else if (objref.current.procid) {
		titlestr = `${aggrstr} Network Flow Summary for process '${objref.current.procname}' of host '${objref.current.hostname}' and cluster '${objref.current.clustername}'`;
		isproc = true;
	}	
	else {
		titlestr = `${aggrstr} Network Flow Summary for Host '${objref.current.hostname}' and cluster '${objref.current.clustername}'`;
		ishost = true;
	}	

	return (
		<Descriptions title={titlestr} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>
		
		<Descriptions.Item label={<em>Start Time</em>}>{moment(summary.starttime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')}</Descriptions.Item>
		<Descriptions.Item label={<em>End Time</em>}>{moment(summary.endtime, moment.ISO_8601).format('YYYY-MM-DD HH:mm:ssZ')}</Descriptions.Item>
		<Descriptions.Item label={<em>Get Info / Monitor</em>}>
		{issvc && <Button type='dashed' onClick={() => getSvcInfo(objref.current.svcsibling === true && objref.current.svcprocmap[0]?.svcidarr ? 
							objref.current.svcprocmap[0].svcidarr.split(',') : [objref.current.svcid], objref.current.parid, objref.current.starttime, 
							modalCount, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile)} >Service '{objref.current.svcname}' Info</Button>}
		{isproc && <Button type='dashed' onClick={() => getProcInfo([objref.current.procid], objref.current.parid, objref.current.starttime, modalCount, addTabCB, remTabCB, 
									isActiveTabCB, tabKey, isTabletOrMobile)} >Process '{objref.current.procname}' Info</Button>}
		{ishost && <Button type='dashed' onClick={() => getHostInfo(objref.current.parid, modalCount, addTabCB, remTabCB, isActiveTabCB)} >Host '{objref.current.hostname}' Info</Button>}
		</Descriptions.Item>
		<Descriptions.Item label={<em># Tiers Shown</em>}>{summary.ntiers}</Descriptions.Item>
		<Descriptions.Item label={<em># Upstream Tiers</em>}>{summary.nupstreamtiers}</Descriptions.Item>
		<Descriptions.Item label={<em># Downstream Tiers</em>}>{summary.ndownstreamtiers}</Descriptions.Item>
		<Descriptions.Item label={<em># Total Flows</em>}>{summary.nflows}</Descriptions.Item>
		<Descriptions.Item label={<em>Flows span # Hosts</em>}>{summary.nhosts}</Descriptions.Item>
		<Descriptions.Item label={<em># Total Connections</em>}>{format(",")(summary.nconns)}</Descriptions.Item>
		<Descriptions.Item label={<em># Total Network Bytes</em>}>{bytesStrFormat(summary.totalbytes, 0)}</Descriptions.Item>
		<Descriptions.Item label={<em># Services</em>}>{summary.nsvc}</Descriptions.Item>

		</Descriptions>
	);
}

export function NetDashboard({svcid, svcname, svcsibling, procid, procname, isprocsvc, parid, autoRefresh, refreshSec, starttime, endtime, useaggregation, addTabCB, remTabCB, isActiveTabCB, tabKey, isTabletOrMobile, iscontainer, pauseUpdateCb})
{
	const 		objref = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : null, isloading : true, isapierror : false});
	const		[fetchIntervalmsec, ] = useState((refreshSec >= netfetchsec  ? refreshSec * 1000 : netfetchsec * 1000));
	const		[isPauseRefresh, pauseRefresh] = useState(false);

	if (objref.current === null) {
		console.log(`Net Dashboard initializing ...`);

		objref.current = {
			isrange 		: (typeof starttime === 'string' && typeof endtime === 'string'),
			isaggregated		: (useaggregation && fetchIntervalmsec >= 2 * netfetchsec),
			aggroper		: "sum",		// XXX We need to add avg/max options
			nextfetchtime		: Date.now(),
			nerrorretries		: 0,
			starttime		: starttime,
			endtime			: endtime,
			hostname		: '',
			clustername		: '',
			svcid			: svcid,
			svcname			: svcname,
			svcsibling		: svcsibling,
			procid			: procid,
			procname		: procname,
			parid			: parid,
			filterset		: null,
			svcprocmap		: null,
			tlastprocmap		: 0,
			nodemap 		: new Map(), 
			edgemap 		: new Map(), 
			hostmap			: new Map(),
			flowarr 		: [], 
			maxResolvedUpstream	: 0,
			minResolvedDownstream	: 0,
			flowHeight		: 300,
			flowWidth		: 1500,
			prevdata		: null,
			pauseRefresh		: false,
			isPauseRefresh		: false,
			modalCount		: 0,
			inactiveWin		: false,
			isstarted		: false,
			isprocessing		: false,
			tier0cli		: null,
			tier0act		: null,
			sliderTimer		: null,
			datahistarr		: [],
		};	
	}

	useEffect(() => {
		console.log(`Net Dashboard initial Effect called...`);

		return () => {
			console.log(`Net Dashboard destructor called...`);
		};	
	}, []);

	const validProps = useCallback(() => {	

		if (!parid) {
			throw new Error(`Mandatory prop parameter parid not specified`);
		}	

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

				if (mend.unix() >= mstart.unix() + 2 * netfetchsec) {
					objref.current.isrange = true;

					if (!objref.current.isaggregated) {
						if (!useaggregation) {
							console.log(`Net Dashboard : Setting data aggregation as range specified`);
						}
						objref.current.isaggregated = true;
					}	
				}	
			}

		}
		else if (!autoRefresh && !starttime) {
			throw new Error(`autoRefresh disabled but no starttime specified`);
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

	}, [objref, parid, starttime, endtime, useaggregation, autoRefresh, addTabCB, remTabCB, isActiveTabCB, tabKey]);	

	if (validProps() === false) {
		throw new Error(`Internal Error : Net Dashboard validProps check failed`);
	}	

	useEffect(() => {
		console.log(`isPauseRefresh Changes seen : isPauseRefresh = ${isPauseRefresh}`);

		objref.current.isPauseRefresh = isPauseRefresh;
		objref.current.pauseRefresh = isPauseRefresh;
	}, [isPauseRefresh, objref]);

	useEffect(() => {
		console.log(`starttime/endtime Changes seen`);

		objref.current.nextfetchtime = Date.now();
	}, [starttime, endtime, objref]);

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

	useEffect(() => {
		
		let 			timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let			currtime = Date.now();

				if (isActiveTabCB && tabKey) {
					const isinactive = !isActiveTabCB(tabKey);

					if (isinactive) {
						objref.current.pauseRefresh = true;
						objref.current.inactiveWin = true;
					}
					else {
						objref.current.pauseRefresh = false;

						if (objref.current.inactiveWin) {
							objref.current.inactiveWin = false;
						}	
					}	
				}

 				if (objref.current.modalCount > 0) {
					objref.current.pauseRefresh = true;
				}	

 				if (objref.current.isPauseRefresh === true) {
					objref.current.pauseRefresh = true;
				}	

				if (true === objref.current.pauseRefresh || currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted) ||
					objref.current.isprocessing === true) {
					return;
				}

				objref.current.isprocessing = true;

				setApiData({data : null, isloading : true, isapierror : false});

				console.log(`Fetching Net Flows...`);

				// Clear previous data
				objref.current.nodemap.clear();
				objref.current.edgemap.clear();
				objref.current.flowarr = [];
				objref.current.maxResolvedUpstream = 0;
				objref.current.minResolvedDownstream = 0;
				objref.current.starttime = starttime ?? moment().subtract(fetchIntervalmsec/1000, 'second').format();
				objref.current.endtime = endtime ?? moment().format();

				const rdata = await getNetFlows({
							objref, svcid, svcname, svcsibling, procid, procname, isprocsvc, parid, 
							starttime : objref.current.starttime,
							endtime	: objref.current.endtime,
							isaggregated : objref.current.isaggregated, 
							aggroper : objref.current.aggroper,
							nodemap : objref.current.nodemap,
							edgemap : objref.current.edgemap,
							hostmap : objref.current.hostmap,
							flowarr : objref.current.flowarr,
							});

				objref.current.isprocessing = false;

				if (autoRefresh === true) {
					objref.current.nextfetchtime = Date.now() + fetchIntervalmsec;
				}
				else {
					objref.current.nextfetchtime = 0;
				}	

				if (safetypeof(rdata) === 'object' && rdata.flowarr && rdata.summary) {
					setApiData({data : rdata, isloading : false, isapierror : false});
				
					objref.current.nerrorretries = 0
					objref.current.isstarted = true;
				}
				else {
					setApiData({data : objref.current.prevdata, isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Data fetch... Will retry a few times later."});

					if (objref.current.nerrorretries < 5) {
						objref.current.nerrorretries++;
						objref.current.nextfetchtime = Date.now() + 30000;
					}	
					else {
						objref.current.nextfetchtime = Date.now() + 60000;
					}	
				}	

			}
			catch(e) {
				objref.current.isprocessing = false;

				if (e.response && (e.response.status === 401)) {
					notification.error({message : "Authentication Failure", 
						description : `Authentication Error occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				}
				else {
					notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
				}

				setApiData({data : objref.current.prevdata, isloading : false, isapierror : true});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				if (objref.current.nerrorretries < 5) {
					objref.current.nerrorretries++;
					objref.current.nextfetchtime = Date.now() + 15000;
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
			console.log(`Destructor called for Net Dashboard interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, svcid, svcname, svcsibling, procid, procname, isprocsvc, parid, autoRefresh, fetchIntervalmsec, starttime, endtime, isActiveTabCB, tabKey]);	
	
	const upTierCB = useCallback(() => {
		if (objref.current.isprocessing === false && objref.current.maxResolvedUpstream > 0) {
			objref.current.isprocessing = true;

			setTimeout(async () => {
				try {
					setApiData({data : null, isloading : true, isapierror : false});
				
					const oldarr = objref.current.flowarr;

					objref.current.flowarr = [...oldarr]; 

					const rdata = await getNextUpstreamFlows({
								objref, 
								maxResolvedUpstream : objref.current.maxResolvedUpstream, 
								minResolvedDownstream : objref.current.minResolvedDownstream,
								starttime : objref.current.starttime,
								endtime	: objref.current.endtime,
								isaggregated : objref.current.isaggregated, 
								aggroper : objref.current.aggroper,
								nodemap : objref.current.nodemap,
								edgemap : objref.current.edgemap,
								hostmap : objref.current.hostmap,
								flowarr : objref.current.flowarr,
								});

					objref.current.isprocessing = false;

					if (safetypeof(rdata) === 'object' && rdata.flowarr && rdata.summary) {
						setApiData({data : rdata, isloading : false, isapierror : false});
					}
					else {
						console.log(`No or invalid data for next Upstream Data fetch. Resetting to previous data...`);
						setApiData({data : objref.current.prevdata, isloading : false, isapierror : false});

						notification.warning({message : "Data Fetch", description : "No Valid Data found during next Upstream Data fetch... "});
					}	
	
				}
				catch(e) {
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during next Upstream Data fetch... "});

					objref.current.isprocessing = false;

					setApiData({data : objref.current.prevdata, isloading : false, isapierror : false});

					console.log(`Exception caught while waiting for next Upstream fetch response : ${e}\n${e.stack}\n`);
				}	
			}, 0);	
		}	
	}, [objref]);

	const downTierCB = useCallback(() => {
		if (objref.current.isprocessing === false && objref.current.minResolvedDownstream < 0) {
			objref.current.isprocessing = true;

			setTimeout(async () => {
				try {
					setApiData({data : null, isloading : true, isapierror : false});
				
					const oldarr = objref.current.flowarr;

					objref.current.flowarr = [...oldarr]; 

					const rdata = await getNextDownstreamFlows({
								objref, 
								maxResolvedUpstream : objref.current.maxResolvedUpstream, 
								minResolvedDownstream : objref.current.minResolvedDownstream,
								starttime : objref.current.starttime,
								endtime	: objref.current.endtime,
								isaggregated : objref.current.isaggregated, 
								aggroper : objref.current.aggroper,
								nodemap : objref.current.nodemap,
								edgemap : objref.current.edgemap,
								hostmap : objref.current.hostmap,
								flowarr : objref.current.flowarr,
								});

					objref.current.isprocessing = false;

					if (safetypeof(rdata) === 'object' && rdata.flowarr && rdata.summary) {
						setApiData({data : rdata, isloading : false, isapierror : false});
					}
					else {
						console.log(`No or invalid data for next Downstream Data fetch. Resetting to previous data...`);
						setApiData({data : objref.current.prevdata, isloading : false, isapierror : false});

						notification.warning({message : "Data Fetch", description : "No Valid Data found during next Downstream Data fetch... "});
					}	

				}
				catch(e) {
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during next Downstream Data fetch... "});

					objref.current.isprocessing = false;

					setApiData({data : null, isloading : false, isapierror : false});

					console.log(`Exception caught while waiting for next Downstream fetch response : ${e}\n${e.stack}\n`);
				}	
			}, 0);	
		}	
	}, [objref]);

	const onElementClick = useCallback((event, elem) => {

		Modal.info({
			title : <span><strong>Flow Info</strong></span>,
			content : (
				<>
				<ErrorBoundary>
				<ComponentLife stateCB={modalCount} />
				{ isNode(elem) ? 
					<FlowNodeDesc node={elem} objref={objref} isTabletOrMobile={isTabletOrMobile} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} /> :
					<FlowEdgeDesc edge={elem} objref={objref} isTabletOrMobile={isTabletOrMobile} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} /> }
				</ErrorBoundary>
				</>
				),	

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	}, [objref, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile, modalCount]);

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

			tstarttime = moment(dateString, moment.ISO_8601).subtract(10, 'seconds').format();
			tendtime = moment(dateString, moment.ISO_8601).add(10, 'seconds').format();
		}

		const			tabKey = `NetFlow_${Date.now()}`;
		
		CreateTab('Network Flows', 
			() => { return <NetDashboard svcid={svcid} svcname={svcname} svcsibling={svcsibling} procid={procid} procname={procname} parid={parid} autoRefresh={false} 
						starttime={tstarttime} endtime={tendtime} 
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [svcid, svcname, svcsibling, procid, procname, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const onNewAutoRefresh = useCallback(() => {
		const			tabKey = `NetFlow_${Date.now()}`;
		
		CreateTab('Network Flows', 
			() => { return <NetDashboard svcid={svcid} svcname={svcname} svcsibling={true} procid={procid} procname={procname} parid={parid} autoRefresh={true} 
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} isTabletOrMobile={isTabletOrMobile}
					/> }, tabKey, addTabCB);

	}, [svcid, svcname, procid, procname, parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);	

	const optionDiv = (width, istrunc) => {
		return (
			<div style={{ marginTop: 30, marginLeft: 30, width: width, display: 'flex', justifyContent: istrunc ? undefined : 'space-between', flexWrap: 'wrap' }} >

			<div>
			<Space>
			<Popover content='Only connections spawned by shown entities to Upstream Services will be displayed'>
			<Button icon={<CaretDownFilled />} disabled={objref.current.isprocessing} onClick={upTierCB} >Get Next Upstream Tier</Button>
			</Popover>
			<Button icon={<CaretUpFilled />} disabled={objref.current.isprocessing} onClick={downTierCB} >Get Next Downstream Tier</Button>
			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>
			{!iscontainer && autoRefresh && isPauseRefresh === false && (<Button icon={<PauseCircleOutlined />} onClick={() => {pauseRefresh(true)}}>Pause Auto Refresh</Button>)}
			{!iscontainer && autoRefresh && isPauseRefresh === true && (<Button icon={<PlayCircleOutlined />} onClick={() => {pauseRefresh(false)}}>Resume Auto Refresh</Button>)}

			{!iscontainer && !autoRefresh && (<Button onClick={() => {onNewAutoRefresh()}}>Get Auto Refreshed Flows</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title={`Get Historical Data ${objref.current.filterset ? 'with filters' : ''}`} 
					showTime={true} showRange={true} minAggrRangeMin={0} maxAggrRangeMin={0} disableFuture={true} />
			</Space>
			</div>

			</div>
		);
	};	

	let			hdrtag = null, bodycont = null;

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'object' && normdata.summary && safetypeof(normdata.flowarr) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		let		titleact, titlecli, acttbl = null, clitbl = null;
		const		height = objref.current.flowHeight, width = objref.current.flowWidth;


		if (svcid) {
			titlecli = `Client connections to Upstream Services from ${objref.current.svcname} Process Group`;
			titleact = `Incoming Client connections to Service ${objref.current.svcname}`;
		}
		else if (procid) {
			titlecli = `Client connections to Upstream Services from Process Group ${objref.current.procname}`;
			titleact = `Incoming Client connections to Process Group ${objref.current.procname} services`;
		}	
		else {
			titlecli = `Client connections to Upstream Services from Tier 0 processes`;
			titleact = `Incoming Client connections to Tier 0 services`;
		}	

		if (Array.isArray(objref.current.tier0cli)) {
			clitbl = (
				<ClientConnSearch parid={objref.current.parid} hostname={objref.current.hostname} starttime={objref.current.starttime} endtime={objref.current.endtime}
					useAggr={objref.current.isaggregated} aggrType={objref.current.aggroper} dataObj={objref.current.tier0cli} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB}titlestr={titlecli} />

			);
		}

		if (Array.isArray(objref.current.tier0act)) {
			if (procid && !isprocsvc) {
				acttbl = null;
			}
			else {
				acttbl = (
					<ActiveConnSearch parid={objref.current.parid} hostname={objref.current.hostname} starttime={objref.current.starttime} endtime={objref.current.endtime}
						useAggr={objref.current.isaggregated} aggrType={objref.current.aggroper} dataObj={objref.current.tier0act} 
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB}titlestr={titleact} />
				);
			}
		}

		return (
				<>
				{alertdata}

				{iscontainer && acttbl}
				{iscontainer && clitbl}
				
				<div style={{ padding : 30 }} >
				<NetSummary objref={objref} summary={normdata.summary} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB}
						tabKey={tabKey} modalCount={modalCount} isTabletOrMobile={isTabletOrMobile} />
				</div>		

				<div style={{ width : width + 40, margin : 'auto' }}>
				{optionDiv(width, width > window.innerWidth - 60)}

				<div style={{ height: height, width: width, marginTop: 30, marginBottom: 30, marginLeft: 30, border: '1px groove #d9d9d9', backgroundColor : '#201d1e' }} >
				<ReactFlowProvider>
				<ReactFlow elements={normdata.flowarr} connectionLineStyle={connectionLineStyle} onElementClick={onElementClick} connectionMode='loose' 
							nodesConnectable={false} zoomOnScroll={false} zoomOnPinch={false} />
				</ReactFlowProvider>
				</div>
				</div>

				{!iscontainer && acttbl}
				{!iscontainer && clitbl}

				</>
			);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'object' && data.summary && safetypeof(data.flowarr) === 'array') { 
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

			console.log(`Net Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Net Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

			objref.current.nextfetchtime = Date.now() + 15000;
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

	return (
		<>
		{!iscontainer && (
		<>
		<Title level={4}><em>{objref.current.isaggregated ? "Aggregated Network Flows" : "Network Flow Dashboard"}</em></Title>
		{hdrtag}
		</>
		)}

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);
}	

