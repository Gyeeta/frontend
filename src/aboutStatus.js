
import 			React, {useState, useEffect} from 'react';
import			{Button, Space, Typography, Tag, Alert, Modal, Descriptions, notification} from 'antd';
import 			{CheckSquareTwoTone, CloseOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined} from '@ant-design/icons';

import 			{format} from "d3-format";
import 			moment from 'moment';
import 			axios from 'axios';

import 			{GyTable, getTableScroll} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, timeDiffString, JSONDescription, LoadingAlert, MBStrFormat} from './components/util.js';
import			{HostInfoDesc} from './hostViewPage.js';			
import			{gyeetaStatusKey} from './gyeetaTabs.js';			

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;

const madhavaCol = [
	{
		title :		'Madhava Name',
		key :		'madhavaname',
		dataIndex :	'madhavaname',
		gytype : 	'string',
		width : 	150,
		fixed : 	'left',
	},	
	{
		title :		'Service IP/Host',
		key :		'svchost',
		dataIndex :	'svchost',
		gytype : 	'string',
		width : 	150,
	},	
	{
		title :		'Service Port',
		key :		'svcport',
		dataIndex :	'svcport',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'Status',
		dataIndex :	'tag',
		gytype :	'number',
		width : 	180,
		render : 	(val, rec) => rec.tag,
	},
	{
		title :		'# Partha Hosts',
		key :		'npartha',
		dataIndex :	'npartha',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'# Max Hosts',
		key :		'maxpartha',
		dataIndex :	'maxpartha',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
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
		title :		'Max DB Storage Days',
		key :		'dbdays',
		dataIndex :	'dbdays',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'DB Disk Usage',
		key :		'dbdiskmb',
		dataIndex :	'dbdiskmb',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
		render : 	(val) => (val !== undefined) ? MBStrFormat(val) : '',
	},
	{
		title :		'Version',
		key :		'version',
		dataIndex :	'version',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		100,
	},	
	{
		title :		'Start Time',
		key :		'procstart',
		dataIndex :	'procstart',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		160,
		render : 	(val, rec) => val ? timeDiffString(val) : '',
	},	
	{
		title :		'Connected to Shyama',
		key :		'shyamaconn',
		dataIndex :	'shyamaconn',
		gytype : 	'boolean',
		responsive : 	['lg'],
		width :		100,
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'red'}}/>),
	},	
	{
		title :		'Connected to DB',
		key :		'dbconn',
		dataIndex :	'dbconn',
		gytype : 	'boolean',
		responsive : 	['lg'],
		width :		100,
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'red'}}/>),
	},	
	{
		title :		'Webservers Connected',
		key :		'nwebserver',
		dataIndex :	'nwebserver',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'Other Madhavas Connected',
		key :		'nmadhava',
		dataIndex :	'nmadhava',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'Host Kernel Version',
		key :		'kernverstr',
		dataIndex :	'kernverstr',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		150,
	},	
	{
		title :		'DB Version',
		key :		'dbversion',
		dataIndex :	'dbversion',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		100,
	},	
	{
		title :		'DB IP/Host',
		key :		'dbhost',
		dataIndex :	'dbhost',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		140,
	},	
	{
		title :		'DB Port',
		key :		'dbport',
		dataIndex :	'dbport',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},
	{
		title :		'DB Logging',
		key :		'dblogmode',
		dataIndex :	'dblogmode',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		100,
	},	
	{
		title :		'Shyama Last Seen',
		key :		'lastseen',
		dataIndex :	'lastseen',
		gytype :	'string',
		responsive : 	['lg'],
		width :		160,
		render : 	(val, rec) => val ? timeDiffString(val) : '',
	},
	{
		title :		'Hostname',
		key :		'hostname',
		dataIndex :	'hostname',
		gytype : 	'string',
		width : 	150,
		fixed : 	'right',
	},	

];	

const parthaCol = [
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		render : 	text => <Button type="link">{text}</Button>,
		width :		150,
		fixed : 	'left',
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		width :		150,
		fixed : 	'left',
	},
	{
		title :		'Status',
		dataIndex :	'tag',
		gytype :	'number',
		width : 	150,
		render : 	(val, rec) => rec.tag,
	},
	{
		title :		'Region Name',
		key :		'region',
		dataIndex :	'region',
		gytype :	'string',
		width :		120,
		responsive : 	['lg'],
	},
	{
		title :		'Zone Name',
		key :		'zone',
		dataIndex :	'zone',
		gytype :	'string',
		width :		120,
		responsive : 	['lg'],
	},
	{
		title :		'Madhava in same Region/Zone',
		dataIndex :	'szone',
		gytype :	'number',
		width : 	150,
		render : 	(val, rec) => ((rec.zone === rec.mzone && rec.region === rec.mregion) ? 
						<CheckSquareTwoTone twoToneColor='green'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'red'}}/>),
	},
	{
		title :		'Version',
		key :		'version',
		dataIndex :	'version',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		100,
	},	
	{
		title :		'Kernel Version',
		key :		'kernverstr',
		dataIndex :	'kernverstr',
		gytype :	'string',
		responsive : 	['lg'],
		width :		120,
	},
	{
		title :		'Boot Time',
		key :		'boot',
		dataIndex :	'boot',
		gytype :	'string',
		responsive : 	['lg'],
		width :		160,
		render : 	(val, rec) => val ? timeDiffString(val) : '',
	},
	{
		title :		'Last Seen',
		key :		'lastseen',
		dataIndex :	'lastseen',
		gytype :	'string',
		responsive : 	['lg'],
		width :		160,
		render : 	(val, rec) => val ? timeDiffString(val) : '',
	},
	{
		title :		'Madhava Name',
		key :		'madhavaname',
		dataIndex :	'madhavaname',
		gytype : 	'string',
		width : 	150,
	},	
	{
		title :		'Madhava IP/Host',
		key :		'msvchost',
		dataIndex :	'msvchost',
		gytype : 	'string',
		width : 	150,
	},	
	{
		title :		'Madhava Port',
		key :		'msvcport',
		dataIndex :	'msvcport',
		gytype :	'number',
		width : 	100,
	},
	{
		title :		'Madhava Region',
		key :		'mregion',
		dataIndex :	'mregion',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		120,
	},	
	{
		title :		'Madhava Zone',
		key :		'mzone',
		dataIndex :	'mzone',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		120,
	},	

];	

function mergeStatusData(mstatus, mlist)
{
	if (!mstatus || !mlist) {
		return null;
	}	
	
	let			obj;

	obj = {
		madarr		: 	[],
		pararr		: 	[],
		madstat		:	{},	
	};

	const			madarr = obj.madarr, pararr = obj.pararr, madstat = obj.madstat;

	for (let mstat of mstatus) {
		if (!mstat.madhavastatus?.madid) {
			continue;
		}

		mstat.madhavastatus.parthalist 		= mstat.parthalist?.parthalist;
		madstat[mstat.madhavastatus.madid] 	= mstat.madhavastatus;

		madarr.push(mstat.madhavastatus);

		if (mstat.parthalist?.parthalist) {
			for (let partha of mstat.parthalist.parthalist) {
				partha.madid		= mstat.madhavastatus.madid;
				partha.madhavaname	= mstat.madhavastatus.madhavaname;
				partha.msvchost		= mstat.madhavastatus.svchost;
				partha.msvcport		= mstat.madhavastatus.svcport;
				partha.mregion		= mstat.madhavastatus.region;
				partha.mzone 		= mstat.madhavastatus.zone;
				partha.mhostname	= mstat.madhavastatus.hostname;

				pararr.push(partha);
			}
		}
	}	

	if (Array.isArray(mlist[0].madhavalist)) {
		for (let mone of mlist[0].madhavalist) {
			const			mstat = madstat[mone.madid];

			if (mstat) {
				mstat.lastseen	= mone.lastseen;
			}
			else {
				// Not connected to webserver
				mone.svchost	= mone.host;
				mone.svcport	= mone.port;

				madstat[mone.madid] = mone;
				madarr.push(mone);
			}	
		}	
	}

	for (let mone of madarr) {
		if (mone.shyamaconn === true && mone.dbconn === true) {
			if (mone.npartha > 0) {
				mone.tag = <Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>;
			}
			else {
				mone.tag = <Tag color="orange">Active : No Hosts currently</Tag>;
			}	
		}	
		else if (mone.shyamaconn === true) {
			mone.tag = <Tag icon={<CloseCircleOutlined />} color="error">DB Unavailable</Tag>;
		}	
		else if (mone.shyamaconn === false) {
			mone.tag = <Tag icon={<CloseCircleOutlined />} color="error">Shyama Not Connected</Tag>;
		}	
		else if (mone.lastseen) {
			// No webserver connection
			
			if (mone.npartha > 0 && mone.isconn === true) {
				mone.tag = <Tag icon={<CloseCircleOutlined />} color="error">Webserver Unavailable</Tag>;
			}	
			else if (mone.isconn === false) {
				mone.tag = <Tag color={mone.npartha > 0 ? "warning" : "blue"}>Unavailable</Tag>;
			}	
			else {
				mone.tag = <Tag color="orange">Inactive : No Hosts currently</Tag>;
			}	
		}	
	}	

	for (let pone of pararr) {
		if (pone.isconn) {
			pone.tag = <Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>;
		}	
		else {
			pone.tag = <Tag color="warning">Unavailable</Tag>;
		}	
	}

	return obj;
}	

function MadhavaParthaStatus({id, addTabCB, remTabCB, isActiveTabCB})
{
	const			[{data, isloading, isapierror}, setApiData] = useState({data : null, isloading : true, isapierror : false});
	let			hinfo = null;

	useEffect(() => {
		
		(async function() 
		{
			try {
				setApiData({data : null, isloading : true, isapierror : false});
				
				const [res, res2] = await Promise.all([ 
					axios({
						url 	: NodeApis.multiquery,
						method	: 'post',
						data : {
							qrytime		: Date.now(),
							timeoutsec 	: 30,

							multiqueryarr	: [
							{
								qid		: 	'madhavastatus',
								qname		:	'madhavastatus',
							},
							{
								qid		: 	'parthalist',
								qname		:	'parthalist',
							},
							],
						},

						timeout : 30000,
					}),
					axios({
						url 	: NodeApis.madhavalist,
						method	: 'post',
						timeout : 30000,
					}),
				]);

				validateApi(res.data);

				validateApi(res2.data, 'Madhava List');

				const			mstatus = res.data, mlist = res2.data;

				if (safetypeof(mstatus) === 'array' && safetypeof(mstatus[0]) === 'object' && safetypeof(mlist) === 'array' && safetypeof(mlist[0]) === 'object') {
					const			mergedata = mergeStatusData(mstatus, mlist);

					setApiData({data : mergedata, isloading : false, isapierror : false});
				}
				else {
					setApiData({data : null, isloading : false, isapierror : true});
					notification.error({message : "Madhava / Partha Status Error", description : "Invalid Data format received from API Response"});

					console.log('Invalid Data response format for Madhava / Partha Status');
				}	
			}
			catch(e) {
				setApiData({data : null, isloading : false, isapierror : true});
				notification.error({message : "Madhava / Partha Status Error", 
						description : `Exception occured for Madhava / Partha Status : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
				console.log(`Exception caught for Madhava / Partha Status fetch response : ${e}\n${e.stack}\n`);
			}	
		})(id);

	}, [id]);	
	
	if (isloading === false && isapierror === false) { 

		if (!data) {
			hinfo = <Alert type="error" showIcon message="Madhava / Partha Status Error Encountered" description="Invalid response received from server..." />;
		}
		else {
			const mtitle = (
			<>
			<Space direction="vertical" >
			<span style={{ fontSize : 16 }} ><em><strong>Madhava Status</strong></em></span>
			<span style={{ fontSize : 14 }} ><em><strong>at time {moment().format()}</strong></em></span>
			</Space>
			</>
			);

			const ptitle = (
			<>
			<Space direction="vertical" >
			<span style={{ fontSize : 16 }} ><em><strong>Partha Hosts Registered</strong></em></span>
			<span style={{ fontSize : 14 }} ><em><strong>at time {moment().format()}</strong></em></span>
			</Space>
			</>
			);

			const getHostInfo = (parid, host) => {

				const modonclick = () => {
					Modal.info({
						title : <span><strong>Host {host} Info</strong></span>,
						content : (
							<>
							<HostInfoDesc parid={parid} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
							</>
							),
						width : '90%',	
						closable : true,
						destroyOnClose : true,
						maskClosable : true,
					});
				};	
				
				return <Button type='dashed' onClick={modonclick} >Get Host System Info</Button>;
			};


			const tableOnRow = (record, rowIndex) => {
				return {
					onClick: event => {
						Modal.info({
							title : <span><strong>Partha Host {record.host}</strong></span>,
							content : (
								<>
								<JSONDescription jsondata={record} ignoreKeyArr={['tag']} />

								<div style={{ marginTop: 60, marginBottom: 30 }} >
								{getHostInfo(record.parid, record.host)}
								</div>
								
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

			const 			expandedRowRender = (rec) => <GyTable columns={parthaCol} dataSource={rec.parthalist} rowKey="parid" onRow={tableOnRow} scroll={getTableScroll()} />;

			hinfo = (
			<>

			{mtitle}
			<GyTable columns={madhavaCol} dataSource={data.madarr} rowKey="madid" expandable={{ expandedRowRender }} scroll={getTableScroll()} />

			<div style={{ marginTop: 60, marginBottom: 40, textAlign: 'center'  }} >
			
			{ptitle}
			<GyTable columns={parthaCol} dataSource={data.pararr} rowKey={((rec) => rec.parid + rec.madid)} onRow={tableOnRow} scroll={getTableScroll()} />

			</div>

			</>
			);
		}
	}	
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Madhava / Partha Status Error Encountered" description={emsg} />;
	}	
	else {
		hinfo = <LoadingAlert message="Fetching Madhava / Partha Status" />;
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);
}

function ShyamaStatusTag({data, oneword, cursor})
{
	let			tag;

	if (safetypeof(data) !== 'object') {
		return null;
	}	

	if (data.nmadactive > 0 && data.nmadactive >= data.minmadhava && data.nactionhdlr > 0 && data.dbconn === true) {
		if (data.npartha > 0) {
			tag = <Tag style={{ cursor : cursor}} icon={<CheckCircleOutlined />} color="success">{!oneword ? "All Components Active" : "Active"}</Tag>;
		}
		else {
			tag = <Tag style={{ cursor : cursor}} icon={<ExclamationCircleOutlined />} color="warning">No Hosts monitored</Tag>;
		}
	}	
	else {
		if (data.nmadactive < data.minmadhava || data.nmadactive === 0) {
			tag = <Tag style={{ cursor : cursor}} icon={<CloseCircleOutlined />} color="error">{!oneword ? "Madhava Servers Unavailable" : "Servers Unavailable"}</Tag>;
		}	
		else if (!data.dbconn) {
			tag = <Tag style={{ cursor : cursor}} icon={<CloseCircleOutlined />} color="error">{!oneword ? "Postgres DB Unavailable" : "DB Unavailable"}</Tag>;
		}	
		else if (data.nactionhdlr === 0) {
			tag = <Tag style={{ cursor : cursor}} icon={<CloseCircleOutlined />} color="error">{!oneword ? "Alert Action Handler Unavailable" : "Alerts Unavailable"}</Tag>;
		}	
		else {
			tag = <Tag style={{ cursor : cursor}} icon={<CloseCircleOutlined />} color="error">Components Unavailable</Tag>;
		}	
	}	
	
	return tag;
}	

function ShyamaStatus({id, addTabCB, remTabCB, isActiveTabCB})
{
	const			[{data, isloading, isapierror}, setApiData] = useState({data : null, isloading : true, isapierror : false});
	let			hinfo = null;

	useEffect(() => {
		
		(async function() 
		{
			try {
				setApiData({data : null, isloading : true, isapierror : false});
				
				const res = await axios({
					url 	: NodeApis.shyamastatus,
					method	: 'post',
					timeout : 30000,
				});

				validateApi(res.data, 'Shyama Status');

				if (safetypeof(res.data) === 'array' && safetypeof(res.data[0]) === 'object') {
					setApiData({data : res.data[0], isloading : false, isapierror : false});
				}
				else {
					setApiData({data : null, isloading : false, isapierror : true});
					notification.error({message : "Shyama Status Error", description : "Invalid Data format received from API Response"});

					console.log('Invalid Data response format for Shyama Status');
				}	
			}
			catch(e) {
				setApiData({data : null, isloading : false, isapierror : true});
				notification.error({message : "Shyama Status Error", 
						description : `Exception occured while waiting for Shyama Status : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
				console.log(`Exception caught while waiting for Shyama Status fetch response : ${e}\n${e.stack}\n`);
			}	
		})(id);

	}, [id]);	
	
	if (isloading === false && isapierror === false) { 

		if (!data) {
			hinfo = <Alert type="error" showIcon message="Shyama Status Error Encountered" description="Invalid response received from server..." />;
		}
		else {
			const title = (
			<>
			<Space direction="vertical" >
			<span style={{ fontSize : 16 }} ><em><strong>Shyama Status</strong></em></span>
			<span style={{ fontSize : 14 }} ><em><strong>at time {moment().format()}</strong></em></span>
			</Space>
			</>
			);

			hinfo = (

			<Descriptions title={title} bordered={true} column={{ lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>

				<Descriptions.Item label="Shyama Status">{<ShyamaStatusTag data={data} />}</Descriptions.Item>
				<Descriptions.Item label="Shyama Service IP/Host">{data.svchost}</Descriptions.Item>
				<Descriptions.Item label="Shyama Service Port">{data.svcport}</Descriptions.Item>

				<Descriptions.Item label="Shyama Name">{data.shyamaname}</Descriptions.Item>
				<Descriptions.Item label="Shyama Region Name">{data.region}</Descriptions.Item>
				<Descriptions.Item label="Shyama Zone Name">{data.zone}</Descriptions.Item>

				<Descriptions.Item label="# Madhava Connected">{data.nmadactive}</Descriptions.Item>
				<Descriptions.Item label="# Madhava Registered">{data.nmadhava}</Descriptions.Item>
				<Descriptions.Item label="Minimum Required Madhava Servers">{data.minmadhava}</Descriptions.Item>

				<Descriptions.Item label="# Partha Hosts Registered">{format(",")(data.npartha)}</Descriptions.Item>
				<Descriptions.Item label="# Web Servers">{data.nwebserver}</Descriptions.Item>
				<Descriptions.Item label="# Alert Action Handlers">{data.nactionhdlr}</Descriptions.Item>

				<Descriptions.Item label="Postgres DB IP/Host">{data.dbhost}</Descriptions.Item>
				<Descriptions.Item label="Postgres DB Port">{data.dbport}</Descriptions.Item>
				<Descriptions.Item label="Postgres DB Connected">{data.dbconn === true ? <CheckSquareTwoTone twoToneColor='green' style={{ fontSize: 18 }} /> : 
											<CloseOutlined style={{ color: 'red'}}/>}</Descriptions.Item>
				<Descriptions.Item label="Postgres Disk Usage ">{MBStrFormat(data.dbdiskmb)}</Descriptions.Item>
				<Descriptions.Item label="Max Days of DB Storage">{format(",")(data.dbdays)}</Descriptions.Item>
				<Descriptions.Item label="Postgres DB Logging Mode">{data.dblogmode}</Descriptions.Item>
											
				<Descriptions.Item label="Shyama Version">{data.version}</Descriptions.Item>
				<Descriptions.Item label="Shyama Process Start Time">{timeDiffString(data.procstart)}</Descriptions.Item>
				<Descriptions.Item label="Shyama Hostname">{data.hostname}</Descriptions.Item>
				<Descriptions.Item label="Shyama Host Kernel Version">{data.kernverstr}</Descriptions.Item>

				<Descriptions.Item label="Webserver Version">{data.webversion}</Descriptions.Item>
				<Descriptions.Item label="Alert Action Handler Version">{data.actionversion}</Descriptions.Item>
				<Descriptions.Item label="Postgres DB Version">{data.dbversion}</Descriptions.Item>
	
			</Descriptions>


			);
		}
	}	
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Shyama Status Error Encountered" description={emsg} />;
	}	
	else {
		hinfo = <LoadingAlert message="Fetching Shyama Status" />;
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);
}	

export function GyeetaStatusTag({autoRefresh, refreshSec, addTabCB, remTabCB, isActiveTabCB})
{
	const			[{data, isloading, isapierror}, setApiData] = useState({data : null, isloading : true, isapierror : false});
	let			hinfo = null;

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				setApiData({data : null, isloading : true, isapierror : false});
				
				const res = await axios({
					url 	: NodeApis.shyamastatus,
					method	: 'post',
					timeout : 30000,
				});

				validateApi(res.data, 'Shyama Status');

				if (safetypeof(res.data) === 'array' && safetypeof(res.data[0]) === 'object') {
					setApiData({data : res.data[0], isloading : false, isapierror : false});
				}
				else {
					setApiData({data : null, isloading : false, isapierror : true});
					console.log('Invalid Data response format for Shyama Status Tag');
				}	
			}
			catch(e) {
				setApiData({data : null, isloading : false, isapierror : true});
				console.log(`Exception caught while waiting for Shyama Status Tag fetch response : ${e}\n${e.stack}\n`);
			}	
			finally {
				if (autoRefresh && refreshSec > 0) {
					timer1 = setTimeout(apiCall, refreshSec * 1000);
				}
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for Shyama Status Tag interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
	}, [autoRefresh, refreshSec]);	
	
	if (isloading === false && isapierror === false) { 

		if (!data) {
			hinfo = null;
		}
		else {
			hinfo = <Button shape="round" onClick={() => {
						const			tabKey = gyeetaStatusKey;

						addTabCB('Gyeeta Status', () => <GyeetaStatus addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />, tabKey);

					}}>{
						<>
						<ShyamaStatusTag data={data} oneword={true} cursor="pointer" />
						<span style={{ color : '#a0c1d3ba' }} > | Hosts {safetypeof(data) === 'object' ? format(',')(data.npartha) : 0}</span> 
						</>
					}</Button>;
		}
	}	
	else if (isapierror) {
		hinfo = null;
	}	
	else {
		hinfo = null;
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);
}	


export function GyeetaStatus({addTabCB, remTabCB, isActiveTabCB})
{
	const [id, setID]		= useState(moment().startOf('minute').unix());

	const optionDiv = () => {
		return (
			<div style={{ marginLeft: 30, marginRight: 30, marginBottom : 30, marginTop : 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', 
						border: '1px groove #7a7aa0', padding : 10 }} >

			<div>
			<Space>

			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			<Button onClick={() => setID(moment().startOf('minute').unix())} >Refresh Gyeeta Status</Button>

			</Space>
			</div>

			</div>
		);
	};	
	
	return (
		<>
		<Title level={4}><em>Gyeeta Status</em></Title>
		{optionDiv()}
		
		<ShyamaStatus id={id} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				
		<div style={{ marginTop: 60, marginBottom: 40, textAlign: 'center'  }} >

		<MadhavaParthaStatus id={id} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />

		</div>
		</>		
	);
}


