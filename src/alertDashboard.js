
import 			React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import			{Button, Space, Modal, Input, Descriptions, Divider, Typography, Tag, Alert, notification, message, Badge, Radio, Statistic, Empty} from 'antd';

import 			moment from 'moment';
import 			axios from 'axios';

import 			{GyTable, getTableScroll} from './components/gyTable.js';
import			{alertDashKey, alertdefKey} from './gyeetaTabs.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, CreateTab, useFetchApi, ComponentLife, ButtonModal, 
			strTruncateTo, JSONDescription, timeDiffString, splitAndTrim, capitalFirstLetter, LoadingAlert, CreateLinkTab} from './components/util.js';
import 			{MultiFilters, SearchTimeFilter, createEnumArray, getSubsysHandlers} from './multiFilters.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';
import 			{ActionInfo} from './alertActions.js';
import			{viewAlertdef, AlertdefDashboard} from './alertDefs.js';
import			{SvcHostMonitor} from './svcMonitor.js';
import			{ProcHostMonitor} from './procMonitor.js';
import			{HostMonitor, HostnameComponent} from './hostMonitor.js';
import			{ClusterMonitor} from './clusterMonitor.js';
import			{CPUMemPage} from './cpuMemPage.js';
import			{NetDashboard} from './netDashboard.js';

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;
const 			{Search} = Input;

const			alertfetchsec = 30;


export const alertSubsys = [
	'clusterstate', 'cpumem', 'hoststate', 'svcstate', 'extsvcstate',
	'svcinfo', 'svcsumm', 'activeconn', 'extactiveconn', 'clientconn', 'extclientconn',
	'procstate', 'extprocstate', 'procinfo', 'topcpu', 'toppgcpu', 'toprss', 'topfork',
];

const astateEnum = [
	{ name : 'Active', 		value : 'active' },
	{ name : 'Acked',		value : 'acked' },
	{ name : 'Resolved',		value : 'resolved' },
	{ name : 'Expired',		value : 'expired' },
];

const severityEnum = [
	{ name : 'Critical',		value : 'critical' },
	{ name : 'Warning',		value : 'warning' },
	{ name : 'Info',		value : 'info' },
	{ name : 'Debug',		value : 'debug' },
];

export const alertsfields = [
	{ field : 'alertid',		desc : 'Alert ID',			type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'alertname',		desc : 'Alert Definition Name',		type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'astate',		desc : 'Alert State',			type : 'enum',		subsys : 'alerts',	valid : null, 		esrc : astateEnum },
	{ field : 'severity',		desc : 'Alert Severity',		type : 'enum',		subsys : 'alerts',	valid : null, 		esrc : severityEnum },
	{ field : 'alerttime',		desc : 'Time of Alert Occurence',	type : 'timestamptz',	subsys : 'alerts',	valid : null, },
	{ field : 'expiry',		desc : 'Time of Alert Expiry',		type : 'timestamptz',	subsys : 'alerts',	valid : null, },
	{ field : 'taction',		desc : 'Time of Alert Action',		type : 'timestamptz',	subsys : 'alerts',	valid : null, },
	{ field : 'tclose',		desc : 'Time when Alert was Closed',	type : 'timestamptz',	subsys : 'alerts',	valid : null, },
	{ field : 'adefid',		desc : 'Alert Definition ID',		type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'actions',		desc : 'Alert Action Names',		type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'annot',		desc : 'Alert Annotations',		type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'acknotes',		desc : 'Alert Acknowledgement Notes',	type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'nrepeats',		desc : 'Alert Repeat Count',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'subsys',		desc : 'Subsystem in Alert Definition',	type : 'enum',		subsys : 'alerts',	valid : null, 		esrc : createEnumArray(alertSubsys) },
	{ field : 'labels',		desc : 'Alert Labels',			type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'alertdata',		desc : 'Alert Data Payload',		type : 'string',	subsys : 'alerts',	valid : null, },
];


export const aggralertsfields = [
	{ field : 'ntotalalt',		desc : 'Total Alerts Seen',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'nopenalt',		desc : 'Open Alerts',			type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'nackalt',		desc : 'Acknowledged Alerts',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'nresolvedalt',	desc : 'Resolved Alerts',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'nexpiredalt',	desc : 'Expired Alerts',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'totalcrit',		desc : 'Total Critical Alerts',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'opencrit',		desc : 'Open Critical Alerts',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'totalwarn',		desc : 'Total Warning Alerts',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'openwarn',		desc : 'Open Warning Alerts',		type : 'number',	subsys : 'alerts',	valid : null, },
	{ field : 'maxtresolve',	desc : 'Max Resolve Time HH:MM:SS',	type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'meantresolve',	desc : 'Mean Resolve Time HH:MM:SS',	type : 'string',	subsys : 'alerts',	valid : null, },
	{ field : 'inrecs',		desc : '# Records in Aggregation',	type : 'number',	subsys : 'alerts',	valid : null, },
];

function severityColor(severity)
{
	switch (severity) {

	case 'critical' 	:	return "#ff0000";

	case 'warning' 		:	return "#8f2121";

	case 'info'		:	return "#b5b216";

	default 		:	return "#16592c";
	}
}	

function getAlertColumns(isAutoRefresh)
{
	return [
	{
		title :		'Alert Time',
		key :		'alerttime',
		dataIndex :	'alerttime',
		gytype :	'string',
		width :		140,
		fixed : 	'left',
		render : 	(val) => isAutoRefresh ? timeDiffString(val) : val,
	},
	{
		title :		'Alert Name',
		key :		'alertname',
		dataIndex :	'alertname',
		gytype : 	'string',
		render : 	(val) => strTruncateTo(val, 64),
	},
	{
		title :		'State',
		key :		'astate',
		dataIndex :	'astate',
		gytype :	'string',
		render : 	(val) => capitalFirstLetter(val),
	},
	{
		title :		'Severity',
		key :		'severity',
		dataIndex :	'severity',
		gytype : 	'string',
		render : 	(val) => <Badge color={severityColor(val)} text={capitalFirstLetter(val)} />,
	},
	{
		title :		'Closed At',
		key :		'tclose',
		dataIndex :	'tclose',
		gytype : 	'string',
		render : 	(val) => { if (val.length > 0) return (isAutoRefresh ? timeDiffString(val) : val); return 'Not Closed' },
		responsive : 	['lg'],
	},
	{
		title :		'Repeat Count',
		key :		'nrepeats',
		dataIndex :	'nrepeats',
		gytype :	'number',
		responsive : 	['lg'],
	},	
	{
		title :		'Expiry Time',
		key :		'expiry',
		dataIndex :	'expiry',
		gytype : 	'string',
		render : 	(val, rec) => { if (!isAutoRefresh) return val; if (rec.tclose.length === 0) return timeDiffString(val); return 'Closed' },
		responsive : 	['lg'],
	},
	{
		title :		'Subsystem',
		key :		'subsys',
		dataIndex :	'subsys',
		gytype :	'string',
		responsive : 	['lg'],
	},	
	
	];
}	

function getAlertAggrColumns()
{
	return [
	{
		title :		'Alert Time',
		key :		'alerttime',
		dataIndex :	'alerttime',
		gytype :	'string',
		width :		140,
		fixed : 	'left',
	},
	{
		title :		'Total Alerts',
		key :		'ntotalalt',
		dataIndex :	'ntotalalt',
		gytype :	'number',
	},	
	{
		title :		'Open Alerts',
		key :		'nopenalt',
		dataIndex :	'nopenalt',
		gytype :	'number',
	},	

	{
		title :		'Acked Alerts',
		key :		'nackalt',
		dataIndex :	'nackalt',
		gytype :	'number',
	},	

	{
		title :		'# Open Critical',
		key :		'opencrit',
		dataIndex :	'opencrit',
		gytype :	'number',
	},	

	{
		title :		'Max Resolve HH:MM:SS',
		key :		'maxtresolve',
		dataIndex :	'maxtresolve',
		gytype :	'string',
		responsive : 	['lg'],
	},	

	{
		title :		'Mean Resolve Time',
		key :		'meantresolve',
		dataIndex :	'meantresolve',
		gytype :	'string',
		responsive : 	['lg'],
	},	

	];
}	


export function AlertQuickFilters({filterCB})
{
	if (typeof filterCB !== 'function') return null;

	const onAlertName = (value) => {
		filterCB(`{ alertname like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onOpen = () => {
		filterCB(`{ astate = 'active' } or { astate = 'acked' }`);
	};	

	const onCritical = () => {
		filterCB(`{ severity = 'critical' }`);
	};	

	const onAnnot = (value) => {
		filterCB(`{ annot like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onLabel = (value) => {
		filterCB(`{ labels like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onRepeat = () => {
		filterCB(`{ nrepeats > 0 }`);
	};	

	return (
	<>	

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Alert Name Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onAlertName} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Get Open Alerts </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onOpen} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>All Critical Alerts </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onCritical} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Alert Annotations Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onAnnot} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Alert Labels Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onLabel} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Get Repeat Alerts </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onRepeat} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	</>
	);
}	

export function AlertMultiQuickFilter({filterCB, quicklinktext, linktext})
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
			title : <Title level={4}>Alerts Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={alertsfields} title='Alerts Advanced Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	const quickfilter = useCallback(() => {
		objref.current.modal = Modal.info({
			title : <Title level={4}>Alerts Quick Filters</Title>,

			content : <AlertQuickFilters filterCB={onFilterCB} />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);

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

export function AlertAggrFilter({filterCB, linktext})
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
			title : <Title level={4}>Aggregated Alerts Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={aggralertsfields} title='Aggregated Alerts Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return (
		<Button onClick={multifilters} >{linktext ?? "Aggregated Alerts Filters"}</Button>
	);	
}	



function AlertdefInfo({config, title})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi({ url : NodeApis.alertdef, method : 'post', data : config }, validateApi, [], 'Alertdef API');

	let		hinfo = null;

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'array' && safetypeof(data[0]) === 'object' && safetypeof(data[0].alertdef) === 'array') {
			if (safetypeof(data[0].alertdef[0]) === 'object') {
				hinfo = viewAlertdef(data[0].alertdef[0], false /* modal */);
			}
			else {
				hinfo = <Alert type="warning" message="No valid data found" showIcon />;
			}	
		}
		else {
			hinfo = <Alert type="error" showIcon message="Server Response format Error : Invalid Response seen" description={`${JSON.stringify(data).slice(0, 256)}`} />;
			console.log(`Alertdef Info Invalid Data seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		if (safetypeof(data) === 'array' && safetypeof(data[0]) === 'object') {
			hinfo = <Alert type="error" message="Failure" description={data[0].msg} showIcon />;
		}
		else {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		}	
		
		console.log(`Alertdef Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
	}	
	else {
		hinfo = <Alert type="info" showIcon message="Waiting for Response..." />;
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);
}	


function AckAlert({alertdata})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi({ url : NodeApis.alerts + '/ack' , method : 'post', data : alertdata }, validateApi, [], 'Alert Acknowledge API');

	let		hinfo = null;

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'array' && safetypeof(data[0]) === 'object') {
			if (data[0].status === 'ok') { 
				hinfo = <Alert type="success" message="Success" description={data[0].msg} showIcon />;
			}
			else {
				hinfo = <Alert type="error" message="Failure" description={data[0].errmsg} showIcon />;
			}
		}
		else {
			hinfo = <Alert type="error" showIcon message="Server Response format Error : Invalid Response seen" description={`${JSON.stringify(data).slice(0, 256)}`} />;
			console.log(`Alert Ack Invalid Data seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		if (safetypeof(data) === 'array' && safetypeof(data[0]) === 'object') {
			hinfo = <Alert type="error" message="Failure" description={data[0].errmsg} showIcon />;
		}
		else {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		}	
		
		console.log(`Alert Acknowledge Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
	}	
	else {
		hinfo = <Alert type="info" showIcon message="Waiting for Response..." />;
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);
}	


function AlertExpandRow({record, modalCount, addTabCB, remTabCB, isActiveTabCB})
{
	let			ackdiv = null, actiondiv = null, annotdesc = null, datadiv = null, drilldiv = null;
	
	if (!record) {
		return null;
	}	
	
	const onAckButton = (value) => {
		Modal.info({
			title : 'Alert Acknowledgement',
			content : (
				<>
				<ErrorBoundary>
				<ComponentLife stateCB={modalCount} />
				<AckAlert alertdata={{ alertid : `${record.alertid}`, astate : 'acked', acknotes : value && value.length > 0 ? `Acked at ${moment().format()} : ${value}` : undefined }}  />
				</ErrorBoundary>
				</>
				),
			width : '70%',
			closable : true,
			destroyOnClose : true,
		});	
	};	

	ackdiv = (
		<>

		<Divider orientation="left" plain>
		<span style={{ fontSize : 14 }}><i><strong>Alert Info for Alertname '{record.alertname}' fired at time {record.alerttime} : </strong></i></span>
		</Divider>

		<div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap' }} >

		<Space>

		{(record.tclose.length === 0) && <Search placeholder="Alert Acknowledgement Notes" onSearch={onAckButton} style={{ width: 500 }} enterButton={<Button>Acknowledge Alert</Button>} /> }

		{(record.tclose.length === 0) && <ButtonModal buttontext={'Set as Resolved (if Manual Resolve set)'}
			contentCB={() => (
				<>
				<ErrorBoundary>
				<ComponentLife stateCB={modalCount} />
				<AckAlert alertdata={{ alertid : `${record.alertid}`, astate : 'resolved' }} />
				</ErrorBoundary>
				</>
			)} />}
				
		<ButtonModal buttontext={'View Alert Definition'}
			contentCB={() => (
				<>
				<ErrorBoundary>
				<ComponentLife stateCB={modalCount} />
				<AlertdefInfo config={{ options : { filter : `adefid = '${record.adefid}'` }}}  title={`Alert Definition for '${strTruncateTo(record.alertname, 64)}'`} />
				</ErrorBoundary>
				</>
			)} />

		</Space>

		</div>
		</>
	);

	actiondiv = (
		<>
		<Divider orientation="left" plain>
		<span style={{ fontSize : 14 }}><i><strong>Actions executed at time {record.taction} : </strong></i></span>
		</Divider>
		<div style={{ display: 'flex', flexWrap: 'wrap', marginTop : 10 }} >
		<Space>
		{
			splitAndTrim(record.actions).map((actname) => {
			return <ButtonModal key={actname} width="90%" title=<Title level={4}><em>Alert Action '{strTruncateTo(actname, 64)}'</em></Title> 
						okText="Close" buttontext={`Action '${strTruncateTo(actname, 64)}'`} 
				contentCB={() => (
					<>
					<ErrorBoundary>
					<ComponentLife stateCB={modalCount} />
					<ActionInfo actname={actname}  />
					</ErrorBoundary>
					</>
				)} />;
			})
		}		
		</Space>

		</div>
		</>
	);

	annotdesc = (
		<>
		<Divider orientation="left" plain>
		<span style={{ fontSize : 14 }}><i><strong>Annotations, Labels and Acknowledgement Notes</strong></i></span>
		</Divider>
		<div style={{ display: 'flex', flexWrap: 'wrap', marginTop : 20, marginBottom : 10 }} >
		<Space direction="vertical">
		{record.annot.length > 0 && <><div><span><i><strong>Annotations : </strong></i>{record.annot}</span></div></>}
		{record.labels.length > 0 && <><div><span><i><strong>Definition Labels : </strong></i>{record.labels}</span></div></>}
		{record.acknotes.length > 0 && <><div><span><i><strong>Acknowledgement Notes : </strong></i>{record.acknotes}</span></div></>}
		</Space>
		</div>
		</>
	);


	const getSvcMonitor = ({svcid, parid, starttime, endtime}) => {
		const		tabKey = `SvcMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Service State around Alert Time</i></span>, 'Service History', 
					() => { return <SvcHostMonitor svcid={svcid} parid={parid} isRealTime={false} starttime={starttime} endtime={endtime}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};

	const getProcMonitor = ({procid, parid, starttime, endtime}) => {
		const		tabKey = `ProcMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Process State around Alert Time</i></span>, 'Process History', 
					() => { return <ProcHostMonitor procid={procid} parid={parid} isRealTime={false} starttime={starttime} endtime={endtime}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};

	const getHostMonitor = ({parid, starttime, endtime, hostname, Wrapper = HostMonitor}) => {
		const		tabKey = `HostMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State around Alert Time</i></span>, 'Host History', 
					() => { return <Wrapper parid={parid} hostname={hostname} isRealTime={false} starttime={starttime} endtime={endtime}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} Component={HostMonitor}
							/> }, tabKey, addTabCB);
	};

	const getCPUMemMonitor = ({parid, starttime, endtime, hostname, Wrapper = CPUMemPage}) => {
		const		tabKey = `CPUMemMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host CPU Memory State around Alert Time</i></span>, 'CPU Memory History', 
					() => { return <Wrapper parid={parid} hostname={hostname} isRealTime={false} starttime={starttime} endtime={endtime}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} Component={CPUMemPage}
							/> }, tabKey, addTabCB);
	};

	const getNetFlows = ({svcid, svcname, parid, procid, procname, starttime, endtime, hostname, Wrapper = NetDashboard}) => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>{svcid ? 'Service' : procid ? 'Process' : 'Host'} Network Flows around Alert Time</i></span>, 'Network Flows', 
					() => { return <Wrapper svcid={svcid} svcname={svcname} parid={parid} procid={procid} procname={procname} hostname={hostname} autoRefresh={false} 
							starttime={starttime} endtime={endtime} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							Component={NetDashboard}
							 /> }, tabKey, addTabCB);
	};

	const getClusterMonitor = ({cluster, starttime, endtime}) => {
		const		tabKey = `ClusterMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster State around Alert Time</i></span>, 'Cluster History', 
					() => { return <ClusterMonitor cluster={cluster} isRealTime={false} starttime={starttime} endtime={endtime}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};


	if (record.alertdata) {
		const			alertdata = record.alertdata;
		const			isaggr = alertdata.inrecs >= 0, fieldCols = getSubsysHandlers(record.subsys)[isaggr ? 'aggrfields' : 'fields'];
		const			tstart = moment(alertdata.time ?? record.alerttime, moment.ISO_8601).subtract(isaggr ? 15 : 10, 'minutes').format(),
					tend = record.alerttime;

		switch (record.subsys) {
		
		case 'svcstate' :
		case 'extsvcstate' :
		case 'svcinfo' :
		case 'activeconn' :
		case 'extactiveconn' :
			if (alertdata.svcid && alertdata.parid) {
				drilldiv = (
				<>
				<Space>
				
				{getSvcMonitor({ svcid : alertdata.svcid, parid : alertdata.parid, starttime : tstart, endtime : tend})}
				{getNetFlows({svcid : alertdata.svcid, svcname : alertdata.name ?? alertdata.svcname, parid : alertdata.parid, starttime : tstart, endtime : tend})}

				</Space>
				</>
				);
			}	
			break;

		case 'procstate' :
		case 'extprocstate' :
		case 'procinfo' :
		case 'clientconn' :
		case 'extclientconn' :
			if ((alertdata.procid || alertdata.cprocid) && alertdata.parid) {
				drilldiv = (
				<>
				<Space>
				
				{getProcMonitor({ procid : alertdata.procid ?? alertdata.cprocid, parid : alertdata.parid, starttime : tstart, endtime : tend})}
				{getNetFlows({procid : alertdata.procid ?? alertdata.cprocid, procname : alertdata.name ?? alertdata.cname, parid : alertdata.parid, starttime : tstart, endtime : tend})}

				</Space>
				</>
				);
			}	
			break;

		default :
			break;
		}	

		if (!drilldiv && alertdata.parid) {
			drilldiv = (
			<>
			<Space>
			
			{getHostMonitor({ parid : alertdata.parid, starttime : tstart, endtime : tend})}
			{getCPUMemMonitor({ parid : alertdata.parid, starttime : tstart, endtime : tend})}
			{getNetFlows({parid : alertdata.parid, starttime : tstart, endtime : tend})}

			</Space>
			</>
			);
		}

		if (!drilldiv && alertdata.host) {
			drilldiv = (
			<>
			<Space>
			
			{getHostMonitor({ hostname : alertdata.host, starttime : tstart, endtime : tend, Wrapper : HostnameComponent})}
			{getCPUMemMonitor({ hostname : alertdata.host, starttime : tstart, endtime : tend, Wrapper : HostnameComponent})}
			{getNetFlows({hostname : alertdata.host, starttime : tstart, endtime : tend, Wrapper : HostnameComponent})}

			</Space>
			</>
			);
		}

		if (!drilldiv && alertdata.cluster) {
			drilldiv = (
			<>
			<Space>
			
			{getClusterMonitor({ cluster : alertdata.cluster, starttime : tstart, endtime : tend})}

			</Space>
			</>
			);
		}	

		datadiv = (
			<JSONDescription jsondata={record.alertdata} titlestr="Alert Payload Data" column={3} fieldCols={fieldCols} />
		);
	}	

	return (
		<>
		<Space direction="vertical" >
		{ackdiv}
		{actiondiv}
		{annotdesc}
		{datadiv}
		<div style={{ marginTop : 20, marginBottom : 20 }} >
		{drilldiv}
		</div>
		</Space>
		</>
	);
}	

export function AlertSummary({normdata, endtime, modalCount, addTabCB, remTabCB, isActiveTabCB })
{
	if (!normdata || safetypeof(normdata) !== 'object' || !normdata.summary) {
		return null;
	}

	let			tstr = '', daysumm = null;
	const			summary = normdata.summary, daystats = normdata.daystats;

	if (daystats) {
		daysumm = (
		<>
		<div style={{ marginBottom : 40 }} >

		<Descriptions title="Alert Statistics for last 24 hours" bordered={true} column={{ md: 3, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em># Total Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={daystats.dayalerts} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Total Alerts Skipped by Silencing</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={daystats.daysilence} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Total Alerts Skipped by Inhibition</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={daystats.dayinhibit} />
			</Descriptions.Item>
		</Descriptions>

		</div>
		</>
		);
	}	

	if (normdata.starttime) {
		if (!endtime) {
			tstr = `For Alerts fired in last ${timeDiffString(normdata.starttime, false /* printago */)} at ${moment().format("MMMM Do YYYY HH:mm:ss.SSS Z")}`;
		}	
		else {
			tstr = `For Alerts fired between ${normdata.starttime} and ${endtime}`;
		}	
	}

	const title = (<div style={{ textAlign : 'center', marginBottom : 20 }}>
		{<><Title level={4}>Alert Summary</Title>
		<span style={{ fontSize : 14 }} > <em>{tstr}</em></span> 
		</>} 
		</div>);

	return (
		<>
		{daysumm}
		<Descriptions title={title} bordered={true} column={{ md: 3, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em># Open Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nopenalt} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Total Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.ntotalalt} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Active Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nopenalt - summary.nackalt} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Acknowledged Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nackalt} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Resolved Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nresolvedalt} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Expired Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nexpiredalt} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Severity Critical Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.totalcrit} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Open Critical Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.opencrit} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Severity Warning Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.totalwarn} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Open Warning Alerts</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.openwarn} />
			</Descriptions.Item>

			<Descriptions.Item label={<em>Max Time to Resolve (HH:MM:SS)</em>}>{summary.maxtresolve}</Descriptions.Item>

			<Descriptions.Item label={<em>Mean Time to Resolve (HH:MM:SS)</em>}>{summary.meantresolve}</Descriptions.Item>

		</Descriptions>

		</>
	);
}

export function AlertsSearch({starttime, endtime, useAggr, aggrMin, aggrType, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, aggrfilter, title, tabKey,
					customColumns, customTableColumns, sortColumns, sortDir})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.alerts,
			method	: 'post',
			data : {
				starttime,
				endtime,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType ?? 'avg',
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns 	: !useAggr ? ['alerttime'] : sortColumns, 
					sortdir 	: !useAggr ? ['desc'] : (sortColumns ? sortDir : undefined),
				},	
			},
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
			notification.error({message : "Data Fetch Exception Error for Alerts Table", 
						description : `Exception occured while waiting for Alerts Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Alerts Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [aggrMin, aggrType, doFetch, endtime, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir]);

	if (isloading === false && isapierror === false) { 
		const			field = "alerts";

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
				if (customTableColumns) {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Alert Info</strong></span>,
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

			let		columns, titlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				titlestr = "Alerts Info";
				timestr = <span style={{ fontSize : 14 }} > for time range {starttime} to {endtime}</span>;
			}	
			else if (!useAggr) {
				columns = getAlertColumns();

				titlestr = 'Alerts Info';
				if (!title) title = 'Alerts';
				timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format()} </span>;
			}
			else {
				columns = getAlertAggrColumns();
				titlestr = "Aggregated Alert Statistics"
				if (!title) title = 'Aggr Alerts';
				
				timestr = <span style={{ fontSize : 14 }} > for time range {starttime} to {endtime}</span>;
			}	

			let			expandedRowRender;

			if (!useAggr) {
				expandedRowRender = (record) => <AlertExpandRow record={record} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />;
			}

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				{timestr}
				<GyTable columns={columns} expandable={!useAggr ? { expandedRowRender } : undefined} expandRowByClick={!useAggr ? true : undefined} 
					dataSource={data.alerts} rowKey="rowid" onRow={tableOnRow} scroll={getTableScroll()} />
				
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


export function alertsTableTab({starttime, endtime, useAggr, aggrMin, aggrType, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, aggrfilter, modal, title,
					customColumns, customTableColumns, sortColumns, sortDir})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Alerts Query", description : `Invalid starttime specified for Alerts : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Alerts Query", description : `Invalid endtime specified for Alerts : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Alerts Query", description : `Invalid endtime specified for Alerts : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	if (!modal) {
		const			tabKey = `Alerts_${Date.now()}`;

		CreateTab(title ?? !useAggr ? "Alerts" : "Aggr Alerts", 
			() => { return <AlertsSearch starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} title={title} customColumns={customColumns} customTableColumns={customTableColumns}
					sortColumns={sortColumns} sortDir={sortDir} /> }, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? !useAggr ? "Alerts" : "Aggr Alerts",

			content : <AlertsSearch starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					title={title} customColumns={customColumns} customTableColumns={customTableColumns}
					sortColumns={sortColumns} sortDir={sortDir} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Close',
			okType : 'default',
		});	
	}	
}

export function AlertDashboard({autoRefresh, refreshSec, starttime, endtime, filter, addTabCB, remTabCB, isActiveTabCB, tabKey})
{
	const 		objref = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const 		[fetchIntervalmsec, ] = useState(autoRefresh && refreshSec >= 30 ? refreshSec * 1000 : alertfetchsec * 1000);

	const		[isPauseRefresh, pauseRefresh] = useState(false);
	const		[, setRefresh] = useState();
	const		[stateFilter, setStateFilter] = useState('active|acked');

	if (objref.current === null) {
		console.log(`Alert Dashboard initializing ...`);

		objref.current = {
			isrange 		: (typeof starttime === 'string' && typeof endtime === 'string'),
			rangesec		: 0,
			nextfetchtime		: Date.now(),
			nerrorretries		: 0,
			prevdata		: null,
			pauseRefresh		: false,
			isPauseRefresh		: false,
			modalCount		: 0,
			isstarted		: false,
		};	
	}

	useEffect(() => {
		console.log(`Alert Dashboard initial Effect called...`);

		return () => {
			console.log(`Alert Dashboard destructor called...`);
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

				if (mend.unix() >= mstart.unix()) {
					objref.current.isrange = true;
					objref.current.rangesec = mend.unix() - mstart.unix();
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

	}, [objref, starttime, endtime, autoRefresh, addTabCB, remTabCB, isActiveTabCB, tabKey]);	

	if (validProps === false) {
		throw new Error(`Internal Error : Alert Dashboard validProps check failed`);
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

	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 30) => {
		return {
			url 	: NodeApis.alerts,
			method	: 'post',
			data : {
				qrytime		: Date.now(),
				timeoutsec 	: timeoutsec,
				filter		: filter,
				options		: {
					...fetchparams,
				}
			},
			timeout : timeoutsec * 1000,
		};
	}, [filter]);

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		conf, currtime = Date.now();
				const		oldpause = objref.current.pauseRefresh;


				if (isActiveTabCB && tabKey) {
					objref.current.pauseRefresh = !isActiveTabCB(tabKey);
				}

				if (objref.current.modalCount > 0) {
					objref.current.pauseRefresh = true;
				}	

				if (objref.current.isPauseRefresh === true) {
					objref.current.pauseRefresh = true;
				}	

				if (true === objref.current.pauseRefresh || currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted)) {
					if (oldpause === false && objref.current.pauseRefresh) {
						setRefresh(true);
					}	

					return;
				}

				conf = getaxiosconf({maxrecs : 10000, sortcolumns : ['alerttime'], sortdir : ['desc']});

				if (!autoRefresh) {
					conf.data.starttime = starttime;

					if (objref.current.isrange) {
						conf.data.endtime = endtime;
					}
				}

				console.log(`Fetching Alerts for config ${JSON.stringify(conf)}`);

				setApiData({data : [], isloading : true, isapierror : false});

				let 		res = await axios(conf);

				if (autoRefresh === true) {
					objref.current.nextfetchtime = Date.now() + fetchIntervalmsec;
				}
				else {
					objref.current.nextfetchtime = 0;
				}	

				validateApi(res.data);

				if (safetypeof(res.data) === 'array' && safetypeof(res.data[0]) === 'object' && safetypeof(res.data[0].alerts) === 'array') { 
					let			summary = null;

					if (typeof res.data[0].starttime === 'string' && ((autoRefresh === true) || (objref.current.isrange && objref.current.rangesec > 60))) {
						// Get the summary aggregation

						conf = getaxiosconf({ aggregate : true });

						conf.data.starttime = res.data[0].starttime;

						if (!endtime) {
							conf.data.endtime = moment().format();
						}
						else {
							conf.data.endtime = endtime;
						}	

						console.log(`Fetching Alert Summary for config ${JSON.stringify(conf)}`);

						try {
							let 			sres = await axios(conf);

							if (safetypeof(sres.data) === 'array' && safetypeof(sres.data[0]) === 'object' && safetypeof(sres.data[0].alerts) === 'array' &&
								safetypeof(sres.data[0].alerts[0]) === 'object') { 

								summary = sres.data[0].alerts[0];
							}
							else {
								notification.error({message : "Summary Data Fetch Error", 
									description : "Invalid Data format during Summary Data fetch...Summary will not be displayed ."});

								console.log(`Invalid Data received for Summary fetch response : Summary will be skipped\n`);
							}	
						}
						catch(e) {
							notification.error({message : "Summary Data Fetch Exception Error", 
									description : `Exception occured while waiting for summary data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

							console.log(`Exception caught while waiting for Summary fetch response : ${e}\n${e.stack}\n`);
						}	
					}	

					res.data[0].summary = summary;

					setApiData({data : res.data, isloading : false, isapierror : false});
				
					objref.current.nerrorretries = 0
					objref.current.isstarted = true;
				}
				else {
					setApiData({data : [], isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Data fetch... Will retry a few times later."});

					if (objref.current.nerrorretries++ < 5) {
						objref.current.nextfetchtime = Date.now() + 30000;
					}	
					else {
						objref.current.nextfetchtime = Date.now() + 60000;
					}	
				}	

			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				if (objref.current.nerrorretries++ < 5) {
					objref.current.nextfetchtime = Date.now() + 30000;
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
			console.log(`Destructor called for Alerts interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, getaxiosconf, autoRefresh, fetchIntervalmsec, starttime, endtime, isActiveTabCB, tabKey]);	
	

	const onHistorical = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter) => {
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

		const			tabKey = `AlertDashboard_${Date.now()}`;
		
		CreateTab('Historical Alerts', 
			() => { return <AlertDashboard autoRefresh={false} starttime={tstarttime} endtime={tendtime} filter={fstr}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	

	const onNewAutoRefresh = useCallback(() => {
		const			tabKey = filter ? `AlertDashboard_${Date.now()}` : alertDashKey;

		CreateTab('Alerts',
			() => { return <AlertDashboard autoRefresh={true} filter={filter}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);

	const timecbnotime = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time Range' showTime={false} showRange={true} minAggrRangeMin={0} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <AlertMultiQuickFilter filterCB={onfiltercb} />;
	}, []);	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			<Button onClick={() => addTabCB('Alert Definitions', 
				() => <AlertdefDashboard addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={alertdefKey} />, alertdefKey)}>Get Alert Definitions</Button>

			</Space>
			</div>


			<div style={{ marginLeft : 20 }}>
			<Space>

			{autoRefresh && isPauseRefresh === false && (<Button onClick={() => {pauseRefresh(true)}}>Pause Auto Refresh</Button>)}
			{autoRefresh && isPauseRefresh === true && (<Button onClick={() => {objref.current.nextfetchtime = Date.now() + 1000; pauseRefresh(false)}}>Resume Auto Refresh</Button>)}

			{!autoRefresh && (<Button onClick={() => {onNewAutoRefresh()}}>Auto Refreshed Dashboard</Button>)}

			<ButtonModal buttontext='Search Historical Alerts' width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onHistorical} title='Historical Alerts'
						timecompcb={timecbnotime} filtercompcb={filtercb} />
				)} />

			</Space>
			</div>

			</div>
			</>
		);
		
	};

	const			onStateSelChange = useCallback((e) => {
		setStateFilter(e.target.value);
	}, []);	

	const stateSelect = () => (
		<>
		<div style={{ textAlign: 'center', marginTop: 20, marginBottom : 20 }} >
		<Radio.Group onChange={onStateSelChange} defaultValue='active|acked'>
			<Radio.Button value='active|acked'>Open Alerts</Radio.Button>
			<Radio.Button value='all'>All Alerts Seen</Radio.Button>
			<Radio.Button value='active'>Active</Radio.Button>
			<Radio.Button value='acked'>Acknowledged</Radio.Button>
			<Radio.Button value='resolved'>Resolved</Radio.Button>
			<Radio.Button value='expired'>Expired</Radio.Button>
		</Radio.Group>	
		</div>
		</>
	);

	const getFilteredData = (normdata) => {
		if (stateFilter === 'all') {
			return normdata;
		}	
		else if (stateFilter === 'active|acked') {
			return normdata.filter((rec) => rec.astate === 'active' || rec.astate === 'acked');
		}

		return normdata.filter((rec) => rec.astate === stateFilter);
	};	

	let			hdrtag = null, bodycont = null;

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && safetypeof(normdata[0]) === 'object' && 
			safetypeof(normdata[0].alerts) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		const 			expandedRowRender = (record) => <AlertExpandRow record={record} modalCount={modalCount} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />;
		let			title;

		if (!normdata[0].summary && normdata[0].starttime) {
			if (!endtime) {
				title = `List of Alerts fired in last ${timeDiffString(normdata[0].starttime, false /* printago */)} from ${moment().format("MMMM DD YYYY HH:mm:ss.SSS Z")}`;
			}	
			else {
				title = `List of Alerts fired between ${normdata[0].starttime} and ${endtime}`;
			}	
		}
		else {
			title = 'List of Alerts';
		}	

		return (
			<>
			{alertdata}

			{optionDiv()}

			{safetypeof(normdata[0].summary) === 'object' && (
			<>
			<section style={{ textAlign: 'center', marginTop: 30, marginBottom: 30  }}>
			<AlertSummary normdata={normdata[0]} endtime={endtime} modalCount={modalCount} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB}
			/>
			</section>
			</>
			)}

			<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 30 }} >
			<Title level={4}>{title}</Title>
			{stateSelect()}
			<GyTable columns={getAlertColumns(autoRefresh)} expandable={{ expandedRowRender }} expandRowByClick={true} 
					dataSource={getFilteredData(normdata[0].alerts)} modalCount={modalCount} 
					rowKey="rowid" scroll={{ x: objref.current.isrange ? 1100 : undefined }} />
			</div>

			</>
		);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && safetypeof(data[0].alerts) === 'array') { 
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
				objref.current.nextfetchtime = Date.now() + 5 * 60000;

				emsg = "Invalid or no data seen. Too many retry errors...";
			}	

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message={emsg} />);

			console.log(`Alert Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Alert Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

			objref.current.nextfetchtime = Date.now() + 30000;
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
		<Title level={4}><em>{filter ? 'Filtered ' : ''}Alerts Dashboard</em></Title>
		{hdrtag} 

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);

}
