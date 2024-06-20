
import 			React, {useState, useEffect, useRef, useCallback} from 'react';
import			{Button, Input, InputNumber, Switch, Space, Form, Typography, Tag, Alert, Radio, Modal, Popconfirm, notification, Empty} from 'antd';

import 			axios from 'axios';

import 			{GyTable} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, useFetchApi,  strTruncateTo, timeDiffString, capitalFirstLetter, LoadingAlert, CreateTab} from './components/util.js';
import 			{MultiFilters} from './multiFilters.js';

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;

const acttypeEnum = [
	{ name : 'Email', 		value : 'email' },
	{ name : 'Slack',		value : 'slack' },
	{ name : 'Pagerduty',		value : 'pagerduty' },
	{ name : 'Webhook',		value : 'webhook' },
	{ name : 'None',		value : 'null' },
];

export const actionfields = [
	{ field : 'actionid',		desc : 'Action ID',			type : 'string',	subsys : 'actions',	valid : null, },
	{ field : 'actname',		desc : 'Action Name',			type : 'string',	subsys : 'actions',	valid : null, },
	{ field : 'acttype',		desc : 'Action Type',			type : 'enum',		subsys : 'actions',	valid : null, 		esrc : acttypeEnum },
	{ field : 'tcreated',		desc : 'Creation Time',			type : 'timestamptz',	subsys : 'actions',	valid : null, },
	{ field : 'action',		desc : 'Action Config',			type : 'string',	subsys : 'actions',	valid : null, },
];

export function getActionColumns(viewCB, deleteCB)
{
	const		colarr = [
	{
		title :		'Action Name',
		key :		'actname',
		dataIndex :	'actname',
		gytype : 	'string',
		render : 	(val, record) => <Button type="link" onClick={viewCB ? () => viewCB(record) : undefined}>{strTruncateTo(val, 128)}</Button>,
	},
	{
		title :		'Action Type',
		key :		'acttype',
		dataIndex :	'acttype',
		gytype :	'string',
		render : 	(val) => capitalFirstLetter(val),
	},
	{
		title :		'Creation Time',
		key :		'tcreated',
		dataIndex :	'tcreated',
		gytype : 	'string',
		render : 	(val) => timeDiffString(val),
	},
	];

	if (typeof deleteCB === 'function') {

		colarr.push({
			title :		'Operations',
			dataIndex :	'del',
			render : 	(_, record) => {
						return (
						<Popconfirm title="Do you want to delete this action?" onConfirm={() => deleteCB(record)}>
							<Button type="link">Delete</Button>
						</Popconfirm>		
						);
					},	
		});	
	}

	return colarr;
}	

function viewAction(record, objref)
{
	if (record && record.action) {
		let			doneCB;

		if (objref && objref.current) {
			doneCB = () => (objref.current.nextfetchtime = Date.now() + 1000);
		}

		Modal.info({
			title : <Title level={4}><em>Alert Action '{strTruncateTo(record.actname, 64)}'</em></Title>,
			content : (
				<>
				<ErrorBoundary>
				<ActionConfig lastobj={record.action} doneCB={doneCB} />
				</ErrorBoundary>						
				</>
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
			okText : 'Close', 
		});
	}
}	

export function ActionMultiQuickFilter({filterCB})
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
			title : <Title level={4}>Alert Action Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={actionfields} title='Alert Action Filters' />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return (<Button onClick={multifilters} >Action Filters</Button>);	
}	

export function ActionsSearch({filter, maxrecs, tableOnRow, dataObj, addTabCB, remTabCB, isActiveTabCB, titlestr, tabKey})
{
	const 			[{ data, isloading, isapierror }, doFetch, fetchDispatch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.actions,
			method	: 'post',
			data : {
				qrytime		: Date.now(),
				timeoutsec 	: 30,
				filter		: filter,
				maxrecs		: maxrecs,
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
			if (safetypeof(dataObj) === 'array') {
				fetchDispatch({ type : 'fetch_success', payload : { actions : dataObj} });
				return;
			}	
			
			doFetch({config : conf, xfrmresp : xfrmresp});
		}
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Actions Table", 
						description : `Exception occured while waiting for Actions Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Actions Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs, dataObj, fetchDispatch]);

	if (isloading === false && isapierror === false) { 
		const			field = "actions";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No Action Definition found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {

			let		columns;

			columns = getActionColumns(typeof tableOnRow !== 'function' ? viewAction : undefined);

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr ?? 'List of Alert Actions'}</Title>
				<GyTable columns={columns} dataSource={data.actions} rowKey="actionid" onRow={tableOnRow} />
				
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


export function actionsTableTab({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title, titlestr, dataObj, extraComp = null})
{
	let			tabKey;

	const getComp = () => { return (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<ActionsSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} title={title} dataObj={dataObj} /> 
				</>
				);
			};

	if (!modal) {
		tabKey = `Action_${Date.now()}`;

		CreateTab(title ?? "Actions", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Alert Actions",

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


const formItemLayout = {
	labelCol: {
		span: 6,
	},
	wrapperCol: {
		span: 10,
	},
};

const tailFormItemLayout = {
	wrapperCol: {
		span: 6,
		offset: 6,
	},
};

function getObjectFromValues(values, acttype)
{
	if (safetypeof(values) !== 'object') {
		return null;
	}

	const			obj = { config : {} };

	for (let key in values) {
		if (values.hasOwnProperty(key)) {
			if ((key === acttype) && (safetypeof(values[key]) === 'object'))  {
				obj.config = values[key];
			}
			else {
				obj[key] = values[key];
			}	
		}
	}	

	return obj;
}	


export function ActionConfig({lastobj, titlestr, doneCB})
{
	const [readonly, setReadonly] 		= useState(!!lastobj);
	const [form] 				= Form.useForm();
	const [acttype, setActtype]		= useState(lastobj ? lastobj.acttype : 'email');
	const [emailSecure, setEmailSecure]	= useState(lastobj && lastobj.acttype === 'email' ? lastobj.config?.secure : true);
	const [emailAuth, setEmailAuth]		= useState(lastobj && lastobj.acttype === 'email' ? lastobj.config?.auth_type : 'login');
	const [webhookAuth, setWebhookAuth]	= useState(lastobj && lastobj.acttype === 'webhook' ? lastobj.config?.auth_type : 'none');

	const onFinish = useCallback(async (values) => {
		// console.log('Received values of form: ', values);
		
		const			typestr = (!lastobj ? 'Add' : 'Update');
		const			obj = getObjectFromValues(values, acttype);

		if (!obj) {
			return;
		}	

		// Now send the action to the server

		const conf = {
			url 	: NodeApis.actions + (!lastobj ? '/add' : '/update'),
			method	: 'post',
			data 	: obj,
			validateStatus : function (status) {
				return (status < 300) || (status === 400) || (status === 409) || (status === 410); 
			},
		};	

		try {
			const 			res = await axios(conf);
			const			apidata = res.data;
			const 			type = safetypeof(apidata);

			if (type === 'array' && (safetypeof(apidata[0]) === 'object')) {
				if (apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
					Modal.error({
						title : `Action ${typestr} Failed` + (apidata[0].error === 409 ? ' due to conflict with existing Action' : ''),
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : `Action ${typestr} Failed`,
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : `Action ${typestr} Success`,
						content : apidata[0].msg,
					});

					if (typeof doneCB === 'function') {
						try {
							doneCB();
						}
						catch(e) {
						}	
					}	

					return;
				}	
			}	
			else if (type === 'object' && apidata.error !== undefined && apidata.errmsg !== undefined) {
				throw new Error(`Server API Error : ${apidata.errmsg}`);
			}	
			else  {
				throw new Error(`Invalid or Not Handled API Response Data seen`);
			}

		}
		catch(e) {
			Modal.error({
				title 	: `Action ${typestr} Failure`,
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Action ${typestr} response : ${e}\n${e.stack}\n`);
		}	

	}, [doneCB, lastobj, acttype]);

	const setLastInitValues = useCallback(() => {
		if ((safetypeof(lastobj) !== 'object') || !lastobj.acttype) {
			return null;
		}

		const			acttype = lastobj.acttype;		
		const			values = {};

		for (let key in lastobj) {
			if (lastobj.hasOwnProperty(key)) {
				if (key === 'config') {
					values[acttype] = lastobj.config;
				}
				else {
					values[key] 	= lastobj[key];
				}	
			}
		}	

		return values;

	}, [lastobj]);	

	const onActChange = useCallback((e) => {
		setActtype(e.target.value);
	}, []);	

	const onEmailSecureChange = useCallback((val) => { 
		setEmailSecure(val); 
	}, []);	
	
	const onEmailAuthChange = useCallback((e) => {
		setEmailAuth(e.target.value);
	}, []);	

	const onWebhookAuthChange = useCallback((e) => {
		setWebhookAuth(e.target.value);
	}, []);	

	const onEdit = useCallback(() => {
		setReadonly(false);
		return true;
	}, []); 

	const getEmail = () => {
		return (
			<>
			<Form.Item name={['email', 'host' ]} label="SMTP Host" 
					rules={[ { required : true, message: 'Please input the SMTP Host!', whitespace: true, max : 512 }, ]} >
				<Input placeholder={!readonly ? "Mail Server Domain such as smtp.gmail.com" : undefined} readOnly={readonly} />
			</Form.Item>	
			
			<Form.Item name={['email', 'port' ]} label="SMTP Port" 
					rules={[ { required : true, type : 'number', message: 'Please input the SMTP Port!', min: 1, max : 65535 }, ]} >
				<InputNumber disabled={readonly} />
			</Form.Item>	

			<Form.Item name={['email', 'secure' ]} label="Secure (TLS) Server" valuePropName="checked" initialValue={!lastobj ? true : undefined} >
				<Switch onChange={onEmailSecureChange} disabled={readonly} />
			</Form.Item>

			{emailSecure && (
				<Form.Item name={['email', 'tls_reject_unauthorized' ]} label="Reject Self Signed Certificates" valuePropName="checked" initialValue={!lastobj ? true : undefined} >
					<Switch disabled={readonly} />
				</Form.Item>
			)}

			<Form.Item name={['email', 'user' ]} label="Sender Email ID" 
					rules={[ { required : true, type : 'email', message: 'Please input the Sender Email!', }, ]} >
				<Input readOnly={readonly} />
			</Form.Item>	
			
			<Form.Item name={['email', 'auth_type']} label="Email Authentication Type" initialValue={!lastobj ? "login" : undefined} >
				<Radio.Group onChange={onEmailAuthChange} disabled={readonly}>
				<Radio.Button value="login">Login</Radio.Button>
				<Radio.Button value="oauth2">OAuth2</Radio.Button>
				<Radio.Button value="cram_md5">CRAM MD5 Login</Radio.Button>
				<Radio.Button value="none">None</Radio.Button>
				</Radio.Group>
			</Form.Item>
			
			{(emailAuth === 'login' || emailAuth === 'cram_md5') && (
				<Form.Item name={['email', 'password']} label="Sender Email Password" rules={[ { required : true, message: 'Please input The Sender Password!', }, ]} > 
					<Input.Password  readOnly={readonly} />
				</Form.Item>
			)}

			{emailAuth === 'oauth2' && (
				<>
				<Form.Item name={['email', 'clientid' ]} label="OAuth Client ID" rules={[ { required : true, message: 'Please input the Client ID!', whitespace: true }, ]} >
					<Input placeholder={!readonly ? "Registered Client ID for Gyeeta" : undefined}  readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['email', 'client_secret' ]} label="OAuth Client Secret" rules={[ { required : true, message: 'Please input the Client Secret!', whitespace: true }, ]} >
					<Input  readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['email', 'access_url' ]} label="OAuth Access URL" 
					rules={[ { required : true, type : 'url', message: 'Please input the Oauth Access URL!', whitespace: true }, ]} >
					<Input placeholder={!readonly ? "URL Endpoint for token generation (e.g. https://accounts.google.com/o/oauth2/token)" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['email', 'access_token' ]} label="OAuth Access Token" >
					<Input placeholder={!readonly ? "Mandatory if no Refresh Token provided" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['email', 'refresh_token' ]} label="Optional Refresh Token" >
					<Input placeholder={!readonly ? "If provided, will be used to generate a new access token if existing one expires or fails" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item label="Optional Access Token Expiry" >
					<Form.Item name={['email', 'expires_in' ]} noStyle >
						<InputNumber disabled={readonly} />
					</Form.Item>	

					<span> msec. Duration of Token in msec.</span>
				</Form.Item>	

				</>
			)}

			<Form.Item name={['email', 'to' ]} label="Comma separated Receipient Email ID(s)" 
					rules={[ { required : true, message: 'Please input the Receipient Emails!', }, ]} >
				<Input readOnly={readonly} />
			</Form.Item>	
			
			<Form.Item name={['email', 'cc' ]} label="Optional Comma separated cc Email ID(s)" >
				<Input readOnly={readonly} />
			</Form.Item>	
			
			<Form.Item name={['email', 'cc' ]} label="Optional Comma separated bcc Email ID(s)" >
				<Input readOnly={readonly} />
			</Form.Item>	
			
			<Form.Item name={['email', 'subject_prefix' ]} label="Email Subject Prefix" initialValue={!lastobj ? "Gyeeta Alert" : undefined} >
				<Input readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['email', 'use_pool' ]} label="Persistent Connection Pool to SMTP Server" valuePropName="checked" initialValue={!lastobj ? true : undefined} >
				<Switch disabled={readonly} />
			</Form.Item>

			<Form.Item name={['email', 'proxy_url' ]} label="Optional Proxy URL" >
				<Input placeholder={!readonly ? "HTTP/HTTPS or SOCKS5/SOCKS4 Proxy supported : e.g. http://proxy-host:1234" : undefined} readOnly={readonly} />
			</Form.Item>	

	
			</>
		);
	};	

	const getSlack = () => {
		return (
			<>
			<Form.Item name={['slack', 'api_url' ]} label="Slack API URL" rules={[ { required : true, type : 'url', message: 'Please input the Slack API URL!', whitespace: true }, ]} >
				<Input placeholder={!readonly ? "Can be a Webhook URL or Chat PostMessage URL" : undefined} readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['slack', 'channel' ]} label="Slack Channel" >
				<Input placeholder={!readonly ? "Optional for Webhook URLs : Can be the Channel ID or name" : undefined} readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['slack', 'access_token' ]} label="OAuth Access Token" >
				<Input placeholder={!readonly ? "Mandatory only for Chat PostMessage URL : Must have chat:write Scope" : undefined} readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['slack', 'proxy_url' ]} label="Optional Proxy URL" >
				<Input placeholder={!readonly ? "HTTP/HTTPS or SOCKS5/SOCKS4 Proxy supported : e.g. http://proxy-host:1234" : undefined} readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['slack', 'tls_reject_unauthorized' ]} label="Reject Self Signed Certificates" valuePropName="checked" initialValue={!lastobj ? true : undefined} >
				<Switch disabled={readonly} />
			</Form.Item>

			</>
		);
	};	

	const getPagerduty = () => {
		return (
			<>
			<Form.Item name={['pagerduty', 'api_url' ]} label="Pagerduty Events API URL" initialValue={!lastobj ? "https://events.pagerduty.com/v2/enqueue" : undefined}>
				<Input readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['pagerduty', 'routing_key' ]} label="Pagerduty Integration Key" 
				rules={[ { required : true, message: 'Please input the Pagerduty Integration Key!', whitespace: true }, ]} >
				<Input placeholder={!readonly ? "Specify Integration (Routing) Key for Events API v2" : undefined} readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['pagerduty', 'proxy_url' ]} label="Optional Proxy URL" >
				<Input placeholder={!readonly ? "HTTP/HTTPS or SOCKS5/SOCKS4 Proxy supported : e.g. http://proxy-host:1234" : undefined} readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['pagerduty', 'tls_reject_unauthorized' ]} label="Reject Self Signed Certificates" valuePropName="checked" initialValue={!lastobj ? true : undefined} >
				<Switch disabled={readonly} />
			</Form.Item>

			</>
			
		);
	};	

	const getWebhook = () => {
		return (
			<>
			<Form.Item name={['webhook', 'api_url' ]} label="Webhook HTTP Post URL" rules={[ { required : true, type : 'url', message: 'Please input the Webhook API URL!', whitespace: true }, ]} >
				<Input />
			</Form.Item>	

			<Form.Item name={['webhook', 'auth_type']} label="Webhook Authentication Type" initialValue={!lastobj ? "none" : undefined} >
				<Radio.Group onChange={onWebhookAuthChange} disabled={readonly}>
				<Radio.Button value="none">None</Radio.Button>
				<Radio.Button value="basic_auth">Basic</Radio.Button>
				<Radio.Button value="bearer">Bearer Token</Radio.Button>
				<Radio.Button value="oauth2">OAuth2</Radio.Button>
				</Radio.Group>
			</Form.Item>

			{webhookAuth === 'basic_auth' && (
				<>
				<Form.Item name={['webhook', 'username' ]} label="Authentication Username" 
						rules={[ { required : true, message: 'Please input the Username!', }, ]} >
					<Input readOnly={readonly} />
				</Form.Item>	
			
				<Form.Item name={['webhook', 'password']} label="Authentication Password" rules={[ { required : true, message: 'Please input The Password!', }, ]} > 
					<Input.Password readOnly={readonly} />
				</Form.Item>
				</>
			)}

			{webhookAuth === 'bearer' && (
				<Form.Item name={['webhook', 'bearer_token']} label="Bearer Token" rules={[ { required : true, message: 'Please input The Token!', }, ]} > 
					<Input readOnly={readonly} />
				</Form.Item>
			)}

			{webhookAuth === 'oauth2' && (
				<>
				<Form.Item name={['webhook', 'clientid' ]} label="OAuth Client ID" rules={[ { required : true, message: 'Please input the Client ID!', whitespace: true }, ]} >
					<Input placeholder={!readonly ? "Registered Client ID for Gyeeta" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['webhook', 'client_secret' ]} label="OAuth Client Secret" rules={[ { required : true, message: 'Please input the Client Secret!', whitespace: true }, ]} >
					<Input readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['webhook', 'access_url' ]} label="OAuth Access URL" 
					rules={[ { required : true, type : 'url', message: 'Please input the Oauth Access URL!', whitespace: true }, ]} >
					<Input placeholder={!readonly ? "Webhook URL for token generation" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['webhook', 'access_token' ]} label="OAuth Access Token" >
					<Input placeholder={!readonly ? "Mandatory if no Refresh Token provided" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['webhook', 'refresh_token' ]} label="Optional Refresh Token" >
					<Input placeholder={!readonly ? "If provided, will be used to generate a new access token if existing one expires or fails" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item label="Optional Access Token Expiry" >
					<Form.Item name={['webhook', 'expires_in' ]} noStyle >
						<InputNumber disabled={readonly} />
					</Form.Item>	

					<span> msec. Duration of Token in msec.</span>
				</Form.Item>	

				<Form.Item name={['webhook', 'scope' ]} label="Optional OAuth Scopes" >
					<Input placeholder={!readonly ? "Space or comma separated string containing list of scopes" : undefined} readOnly={readonly} />
				</Form.Item>	

				<Form.Item name={['webhook', 'use_auth_header' ]} label="Payload in Auth Header" valuePropName="checked" initialValue={!lastobj ? true : undefined} >
					<Switch disabled={readonly} />
				</Form.Item>

				</>
			)}

			<Form.Item name={['webhook', 'proxy_url' ]} label="Optional Proxy URL" >
				<Input placeholder={!readonly ? "HTTP/HTTPS or SOCKS5/SOCKS4 Proxy supported : e.g. http://proxy-host:1234" : undefined} readOnly={readonly} />
			</Form.Item>	

			<Form.Item name={['webhook', 'tls_reject_unauthorized' ]} label="Reject Self Signed Certificates" valuePropName="checked" initialValue={!lastobj ? true : undefined} >
				<Switch disabled={readonly} />
			</Form.Item>

			</>
		);
	};	


	const getConfigItems = () => {
		switch (acttype) {
		
		case 'email' 		: 	return getEmail();

		case 'slack'		: 	return getSlack();

		case 'pagerduty'	: 	return getPagerduty();

		case 'webhook'		:	return getWebhook();

		default			:	return null;
		}	
	};	

	return (
		<>
		<ErrorBoundary>

		{titlestr && <Title level={4} style={{ textAlign : 'center', marginBottom : 30, }} ><em>{titlestr}</em></Title>}
		
		<Form {...formItemLayout} form={form} name="action" onFinish={onFinish} scrollToFirstError initialValues={setLastInitValues()} >

			<Form.Item name="name" label="Action Name" 
					rules={[ { required : true, message: 'Please input the Action Name!', whitespace: true, max : 256 }, ]} >
				<Input autoComplete="off" readOnly={!!lastobj} />
			</Form.Item>

			<Form.Item name="acttype" label="Action Type" initialValue={!lastobj ? "email" : undefined} >
				<Radio.Group onChange={onActChange} disabled={!!lastobj}>
				<Radio.Button value="email">Email</Radio.Button>
				<Radio.Button value="slack">Slack</Radio.Button>
				<Radio.Button value="pagerduty">Pagerduty</Radio.Button>
				<Radio.Button value="webhook">Custom Webhook</Radio.Button>
				<Radio.Button value="null">None</Radio.Button>
				</Radio.Group>
			</Form.Item>

			{getConfigItems()}

			<Form.Item name="send_resolved"  label="Action to be invoked on Alert Resolution / Expiry" 
				valuePropName="checked" initialValue={!lastobj ? true : undefined} >
				<Switch disabled={readonly} />
			</Form.Item>
		
			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button type="primary" htmlType="submit" disabled={readonly}>Submit</Button>
				{readonly && doneCB && <Button htmlType="button" onClick={onEdit}>Edit Action</Button>}
				</Space>
				</>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);

}


export function ActionInfo({actname, title})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi({ url : NodeApis.actions, method : 'post', data : { options : { filter : `actname = '${actname}'` }} }, 
										validateApi, [], 'Alert Actions API');
	let		hinfo = null;

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'array' && safetypeof(data[0]) === 'object' && safetypeof(data[0].actions) === 'array') {
			if (safetypeof(data[0].actions[0]) === 'object' && data[0].actions[0].action) {
				hinfo = <ActionConfig lastobj={data[0].actions[0].action} titlestr={title} />
			}
			else {
				hinfo = <Alert type="warning" message="No valid data found" showIcon />;
			}	
		}
		else {
			hinfo = <Alert type="error" showIcon message="Server Response format Error : Invalid Response seen" description={`${JSON.stringify(data).slice(0, 256)}`} />;
			console.log(`Alert Action Info Invalid Data seen : ${JSON.stringify(data).slice(0, 1024)}`);
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
		
		console.log(`Alert Action Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
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


export function ActionDashboard({filter})
{
	const 		objref = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});

	if (objref.current === null) {
		objref.current = {
			nextfetchtime		: Date.now(),
			nerrorretries		: 0,
			prevdata		: null,
			isstarted		: false,
		};	
	}

	useEffect(() => {
		console.log(`Action Dashboard initial Effect called...`);

		return () => {
			console.log(`Action Dashboard destructor called...`);
		};	
	}, []);

	const deleteAction = useCallback(async (record) => {
		
		if (!record || !record.actionid) {
			return;
		}

		const conf = {
			url 	: NodeApis.actions + `/${record.actionid}`,
			method	: 'delete',
			validateStatus : function (status) {
				return (status < 300) || (status === 400) || (status === 410); 
			},
		};	

		try {
			const 			res = await axios(conf);
			const			apidata = res.data;
			const 			type = safetypeof(apidata);

			if (type === 'array' && (safetypeof(apidata[0]) === 'object')) {
				if (apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
					Modal.error({
						title : 'Action Delete Failed',
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : 'Action Delete Failed',
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : 'Action Delete Successful',
						content : apidata[0].msg,
					});

					const			pdata = objref.current.prevdata;

					if (safetypeof(pdata) === 'array' && pdata.length > 0 && safetypeof(pdata[0].actions) === 'array') { 
						const tdata = [...pdata];
						
						tdata[0].actions = tdata[0].actions.filter((rec) => rec.actionid !== record.actionid);

						setApiData({data : tdata, isloading : false, isapierror : false});
					}

					return;
				}	
			}	
			else if (type === 'object' && apidata.error !== undefined && apidata.errmsg !== undefined) {
				throw new Error(`Server API Error : ${apidata.errmsg}`);
			}	
			else  {
				throw new Error(`Invalid or Not Handled API Response Data seen`);
			}

		}
		catch(e) {
			Modal.error({
				title 	: `Action Delete Failure`,
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Action Delete response : ${e}\n${e.stack}\n`);
		}	


	}, [objref]);	

	const onAddCB = useCallback(() => {
		const modal = Modal.info();

		modal.update({	
			title : <Title level={4}><em>New Alert Action</em></Title>,
			content : <ActionConfig doneCB={() => setTimeout(() => {modal.destroy(); objref.current.nextfetchtime = Date.now();}, 1000)} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'primary',
		});	
	}, [objref]);	
	
	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 10) => {

		return {
			url 	: NodeApis.actions,
			method	: 'post',
			data : {
				qrytime		: Date.now(),
				timeoutsec 	: timeoutsec,
				options		: {
					filter		: filter,

					...fetchparams,
				},
			},
			timeout : timeoutsec * 1000,
		};
	}, [filter]);


	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		conf, currtime = Date.now();

				if (currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted)) {
					return;
				}

				conf = getaxiosconf({ cachebreak : objref.current.isstarted ? Date.now() : undefined });

				console.log(`Fetching Action List for config ${JSON.stringify(conf)}`);

				setApiData({data : [], isloading : true, isapierror : false});

				let 		res = await axios(conf);

				objref.current.nextfetchtime = 0;

				validateApi(res.data);

				if (safetypeof(res.data) === 'array') { 
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
						objref.current.nextfetchtime = Date.now() + 5 * 60000;
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
					objref.current.nextfetchtime = Date.now() + 5 * 60000;
				}	
			}	
			finally {
				timer1 = setTimeout(apiCall, 1000);
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for Action interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, getaxiosconf]);	
	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<Button onClick={onAddCB}>Add New Action</Button>

			<Button onClick={() => {objref.current.nextfetchtime = Date.now()}}>Refresh Action List</Button>

			</div>
			</>
		);
	};


	let			hdrtag = null, bodycont = null, filtertag = null;

	if (filter) {
		filtertag = <Tag color='cyan'>Filters Set</Tag>;
	}	

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && safetypeof(normdata[0]) === 'object' && safetypeof(normdata[0].actions) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		const		columns = getActionColumns((record) => viewAction(record, objref), deleteAction);

		return (
			<>
			{alertdata}

			{optionDiv()}

			<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 30 }} >
			<Title level={4}>List of Alert Actions</Title>
			<GyTable columns={columns} dataSource={normdata[0].actions} rowKey="actionid" />
			</div>

			</>
		);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && safetypeof(data[0].actions) === 'array') { 
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

			console.log(`Action Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Action Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

			objref.current.nextfetchtime = Date.now() + 30000;
		}
		else if (isloading) {
			hdrtag = <Tag color='blue'>Loading Data</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="info" showIcon message="Loading Data..." />);
		}
		else {
			bodycont = getContent(objref.current.prevdata, <Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);
		}	
	}

	
	return (
		<>
		<Title level={4}><em>Alert Actions{ filter ? ' with input filters' : ''}</em></Title>
		{hdrtag} {filtertag}

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);
}


