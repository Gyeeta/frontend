
import 			React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import			{Button, Modal, Input, Descriptions, Typography, Tag, Alert, notification, message, Badge, Radio, Statistic, Empty, 
			Space} from 'antd';
import 			{ CheckSquareTwoTone, CloseOutlined } from '@ant-design/icons';

import 			moment from 'moment';
import 			axios from 'axios';
import 			{format} from "d3-format";

import 			{GyTable, getTableScroll} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, CreateTab, useFetchApi, ComponentLife, ButtonModal, usecStrFormat, bytesStrFormat,
			strTruncateTo, JSONDescription, timeDiffString, splitAndTrim, capitalFirstLetter, LoadingAlert, CreateLinkTab,
			mergeMultiMadhava, getLocalTime} from './components/util.js';
import 			{MultiFilters, SearchTimeFilter, createEnumArray, getSubsysHandlers, SearchWrapConfig} from './multiFilters.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';
import			{NetDashboard} from './netDashboard.js';
import			{SvcMonitor} from './svcMonitor.js';

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;
const 			{Search} = Input;

export const protocolEnum = [
	'HTTP1', 'HTTP2', 'Postgres', 'MySQL', 'Mongo', 'Redis', 'Unknown', 
];

const traceStatusEnum = [
	'Active', 'Stopped', 'Failed', 'Starting', 
];

const tracereqfields = [
	{ field : 'req',		desc : 'Trace Request API',		type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'resp',		desc : 'Response in usec',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'netin',		desc : 'Request Inbound Bytes',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'netout',		desc : 'Response Outbound Bytes',	type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'err',		desc : 'Response Error Code',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'errtxt',		desc : 'Resp Error Text String',	type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'status',		desc : 'HTTP Status Code',		type : 'number',	subsys : 'tracereq',	valid : null, },
	{ field : 'app',		desc : 'Client Application String',	type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'user',		desc : 'Client Username String',	type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'db',			desc : 'Database Name',			type : 'string',	subsys : 'tracereq',	valid : null, },
	{ field : 'svcname',		desc : 'Service Name',			type : 'string',	subsys : 'tracereq',	valid : null, },
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

const exttracefields = [
	{ field : 'cname',		desc : 'Client Process Name',		type : 'string',	subsys : 'exttracereq',	valid : null, },	
	{ field : 'csvc',		desc : 'Is Client a Service?',		type : 'boolean',	subsys : 'exttracereq',	valid : null, },	
	{ field : 'cprocid',		desc : 'Client Process Gyeeta ID',	type : 'string',	subsys : 'exttracereq',	valid : null, },	
	{ field : 'cparid',		desc : 'Client Partha ID',		type : 'string',	subsys : 'exttracereq',	valid : null, },
	{ field : 'cmadid',		desc : 'Client Madhava ID',		type : 'string',	subsys : 'exttracereq',	valid : null, },
];


const tracestatusfields = [
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

const tracehistoryfields = [
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
			key :		'resp',
			dataIndex :	'resp',
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
			title :		'Username',
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

export function traceReqOnRow({parid, endtime, addTabCB, remTabCB, isActiveTabCB})
{
	return (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span style={{ textAlign: 'center' }}><strong>{record.svcname} Trace API</strong></span>,
					content : (
						<>
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

export function TraceReqModalCard({rec, parid, endtime, titlestr, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const			fieldCols = rec.cname !== undefined ? [...tracereqfields, ...exttracefields] : tracereqfields;

	return (
		<>
		<div style={{ overflowX : 'auto', overflowWrap : 'anywhere', margin: 30, padding: 10, border: '1px groove #d9d9d9', maxHeight : 200 }} >
		<h2 style={{ textAlign: 'center' }}>Request API</h2>
		<p>
		<code style={{ fontFamily: 'Consolas,"courier new"', fontSize: '105%', textAlign: 'center' }}>{rec.req}</code>
		</p>
		</div>
		<JSONDescription jsondata={rec} titlestr={titlestr ?? 'Record'} fieldCols={fieldCols} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} 
				ignoreKeyArr={[ 'req', 'rowid', 'uniqid', 'nprep', 'tprep' ]} />
		</>
	);	
}

function getTracestatusColumns({istime = true, getTraceDefCB, starttime, endtime, addTabCB, remTabCB, isActiveTabCB })
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
			title :		'Is TLS Encrypted?',
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
							starttime, endtime, maxrecs : 10000, addTabCB, remTabCB, isActiveTabCB, 
							wrapComp : SearchWrapConfig, })} size='small' type='primary' >Set Trace Monitor</Button>
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


export function TracestatusSearch({starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, 
					customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb})
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
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
			}
			else {
				rowKey = ((record) => record.rowid ?? (record.time + record.svcid ? record.svcid : ''));
				columns = getTracestatusColumns({ starttime, endtime, addTabCB, remTabCB, isActiveTabCB });

				titlestr = `${useAggr ? 'Aggregated ' : ''} Trace Status `;
			
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;
			}	

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

export function tracestatusTab({starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title,
					customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
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
						recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={TracestatusSearch} /> 
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
					recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={TracestatusSearch} />
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


export function TracehistorySearch({starttime, endtime, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.tracehistory,
			method	: 'post',
			data : {
				starttime,
				endtime,
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

	}, [doFetch, endtime, filter, maxrecs, starttime, ]);

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
			let		columns, rowKey, titlestr, timestr;

			rowKey = ((record) => record.time + record.svcid);
			columns = tracehistoryCol;

			titlestr = 'Trace History';
			
			timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				{timestr}
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

export function TracereqSearch({parid, starttime, endtime, isext, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, customColumns, 
					sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	const			[isrange, setisrange] = useState(false);
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
				timeoutsec 	: 100,
				options : {
					maxrecs 	: maxrecs,
					filter		: filter,
					columns		: customColumns,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
					recoffset       : recoffset > 0 ? recoffset : undefined,
				},	
			},
			timeout : 100 * 1000,
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

	}, [parid, doFetch, endtime, filter, maxrecs, starttime, isext, customColumns, sortColumns, sortDir, recoffset]);

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


	if (isloading === false && isapierror === false) { 
		const			field = isext ? "exttracereq" : "tracereq";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid Trace Request response received from server..."} />;
			closetab = 60000;
		}
		else {
			if (typeof tableOnRow !== 'function') {
				tableOnRow = traceReqOnRow({parid, endtime, addTabCB, remTabCB, isActiveTabCB});
			}

			let			columns, rowKey, titlestr, timestr;

			rowKey = 'rowid';
			titlestr = 'Trace Requests';

			if (!isrange) {
				timestr = <span style={{ fontSize : 14 }} ><strong> at {starttime ?? moment().format("MMM Do YYYY HH:mm:ss.SSS Z")} </strong></span>;
			}
			else {
				timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss.SSS Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss.SSS Z")}</strong></span>;
			}	

			columns = getTracereqColumns(isext, !parid);

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
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

export function traceRequestTab({starttime, endtime, isext, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, modal, title,
					customColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
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
					<Comp starttime={starttime} endtime={endtime} isext={isext} filter={filter} 
						maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} customColumns={customColumns} sortColumns={sortColumns} sortDir={sortDir} 
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
				<Comp starttime={starttime} endtime={endtime} isext={isext} filter={filter} 
					maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} sortColumns={sortColumns} sortDir={sortDir} 
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


export function TraceStatusPage({starttime, endtime, addTabCB, remTabCB, isActiveTabCB})
{
	const [tstart, setStart]		= useState(starttime);

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

			{!starttime && <Button onClick={() => setStart(moment().startOf('minute').format())} >Refresh Trace Status</Button>}

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
		
		<TracestatusSearch starttime={tstart} endtime={endtime}
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				
		<div style={{ marginTop: 40, marginBottom: 40 }} />

		<TracehistorySearch starttime={tstart} endtime={endtime}
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
		</>		
	);
}

export function traceMonitorTab({svcid, svcname, parid, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, wrapComp, extraComp = null, ...props})
{
	const				tabKey = `Trace ${svcname ?? ''} ${svcid.slice(0, 5)}..`;
	const				Comp = wrapComp ?? TraceMonitor;

	CreateTab(tabKey, 
		() => (
			<>
			{typeof extraComp === 'function' ? extraComp() : extraComp}
			<Comp {...props} svcid={svcid} svcname={svcname} parid={parid} starttime={starttime} endtime={endtime} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} origComp={TraceMonitor} />
			</>		
		), tabKey, addTabCB);
}


export function TraceMonitor({svcid, svcname, parid, starttime, endtime, maxrecs, addTabCB, remTabCB, isActiveTabCB, tabKey, ...props})
{
	const 				[svcmonkey, setsvcmonkey] = useState(1);
	const				svcfilter = `{ svcid = '${svcid}' }`;	
	let				monaggrsec, svcmonstart = starttime;

	useEffect(() => {
		// Force SvcMonitor to remount
		setsvcmonkey(prev => prev + 1);
	}, [starttime, endtime]);

	if (starttime && endtime) {
		let			endsec = moment(endtime, moment.ISO_8601), startsec = moment(starttime, moment.ISO_8601);

		if (endsec.unix() >= startsec.unix() + 1800) {
			monaggrsec = 60;
		}	

		if (endsec.unix() - startsec.unix() < 300) {
			startsec = endsec.subtract(300, 'seconds');
			svcmonstart = startsec.format();
		}	
	}	
	
	return (
		<>
		<TracereqSearch {...props} parid={parid} filter={svcfilter} starttime={starttime} endtime={endtime} maxrecs={maxrecs} 
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} isext={true} tabKey={tabKey} />
		<div style={{ marginTop : 40 }} />
		<NetDashboard {...props} svcid={svcid} svcname={svcname} parid={parid} starttime={starttime} endtime={endtime}
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} iscontainer={true} />
		<div style={{ marginTop : 40 }} />
		<SvcMonitor {...props} svcid={svcid} svcname={svcname} parid={parid} key={svcmonkey} starttime={svcmonstart} endtime={endtime} aggregatesec={monaggrsec} 
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} iscontainer={true} />
		</>
	);
}

