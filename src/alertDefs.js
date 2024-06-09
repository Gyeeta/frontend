

import 			React, {useState, useEffect, useRef, useCallback} from 'react';
import			{Button, Input, InputNumber, Switch, Space, Form, Typography, Alert, Select, Radio, Modal, Empty, Divider, notification, Tag, Popconfirm} from 'antd';
import 			{CheckSquareTwoTone, CloseOutlined} from '@ant-design/icons';

import 			axios from 'axios';

import 			{GyTable, getTableScroll} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, LoadingAlert, isEmptyObj, ButtonModal, splitAndTrim, strTruncateTo, timeDiffString,
			useFetchApi, CreateTab, JSONDescription, capitalFirstLetter} from './components/util.js';
import 			{getSubsysHandlers, getAlertSubsysFromCategory, getAlertSubsysCategories, getFieldsExcludingHost, isFieldPresent,
			SubsysMultiFilters, CustomAggrColModal} from './multiFilters.js';
import 			{DateTimeZonePicker, disablePastTimes, TimeRangeButton} from './components/dateTimeZone.js';
import			{alertsfields} from './alertDashboard.js';
import			{getActionColumns} from './alertActions.js';
import			{SilenceRules} from './alertSilences.js';
import			{MultiFilters} from './multiFilters.js';
import			{addAlertdefKey} from './gyeetaTabs.js';

const 			{TextArea} = Input;
const 			{Title} = Typography;
const 			{ErrorBoundary} = Alert;

export const alertdeffields = [
	{ field : 'adefid',		desc : 'Alert Definition ID',		type : 'string',	subsys : 'alertdef',	valid : null, },
	{ field : 'alertname',		desc : 'Alert Name',			type : 'string',	subsys : 'alertdef',	valid : null, },
	{ field : 'tcreated',		desc : 'Creation Time',			type : 'timestamptz',	subsys : 'alertdef',	valid : null, },
	{ field : 'disabled',		desc : 'Is disabled?',			type : 'boolean',	subsys : 'alertdef',	valid : null, },
	{ field : 'definition',		desc : 'Alert Definition Config',	type : 'string',	subsys : 'alertdef',	valid : null, },
];

function getAlertdefColumns(viewCB, deleteDisableCB)
{
	const		colarr = [
	{
		title :		'Alert Name',
		key :		'alertname',
		dataIndex :	'alertname',
		gytype : 	'string',
		width : 	360,
		render : 	(val, record) => <Button type="link" onClick={viewCB ? () => viewCB(record) : undefined}>{strTruncateTo(val, 128)}</Button>,
	},
	{
		title :		'Creation Time',
		key :		'tcreated',
		dataIndex :	'tcreated',
		gytype : 	'string',
		render : 	(val) => timeDiffString(val),
	},
	{
		title :		'Subsystem',
		dataIndex :	['definition', 'subsys'],
		gytype : 	'number',
		sorter :	false,
	},
	{
		title :		'Alert Type',
		dataIndex :	['definition', 'alerttype'],
		gytype : 	'number',
		sorter :	false,
		render : 	(val, record) => { return record.definition.queryperiod ? 'DB Aggregated' : 'Realtime' },
	},
	{
		title :		'Alert Severity',
		dataIndex :	['definition', 'severity'],
		gytype : 	'number',
		sorter :	false,
		render : 	(val, record) => { return (typeof record.definition.severity === 'string') ? capitalFirstLetter(record.definition.severity) : 'Dynamic' },
	},
	{
		title :		'Is disabled?',
		key :		'disabled',
		dataIndex :	'disabled',
		gytype : 	'boolean',
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor='red'  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
	},
	];

	if (typeof deleteDisableCB === 'function') {

		colarr.push({
			title :		'Operations',
			dataIndex :	'deldis',
			render : 	(_, record) => {
						return (
						<>
						<Space>

						{!record.disabled && (
						<Popconfirm title="Do you want to Disable this Alert Definition?" onConfirm={() => deleteDisableCB(record, 'disable')}>
							<Button type="link">Disable</Button>
						</Popconfirm>		
						)}

						{record.disabled && (
						<Popconfirm title="Do you want to Enable this Alert Definition?" onConfirm={() => deleteDisableCB(record, 'enable')}>
							<Button type="link">Enable</Button>
						</Popconfirm>		
						)}

						<Popconfirm title="Do you want to Delete this Alert Definition?" onConfirm={() => deleteDisableCB(record, 'delete')}>
							<Button type="link">Delete</Button>
						</Popconfirm>		

						</Space>
						</>
						);
					},	
		});	
	}

	return colarr;
}	

export function AlertdefMultiQuickFilter({filterCB, linktext})
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
			title : <Title level={4}>Alert Definition Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={alertdeffields} title='Alert Definition Filters' />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return (<Button onClick={multifilters} >{linktext ?? "Alert Definition Filters"}</Button>);	
}	

const alertdefKeyLabels = 
{
	alertname	:	'Alert Name',
	severity	:	'Alert Severity',
	subsys		:	'Subsystem',
	alerttype	:	'Alert Type',
	columns		:	'Custom Columns',
	filter		:	'Pre Aggregation Filter',
	aggrfilter	:	'Post Aggregation Filter',
	aggroper	:	'Aggregation Operator',
	queryperiod	:	'Query Search Duration',
	queryevery	:	'Query Repeat Interval',
	numcheckfor	:	'Consecutive Hits for Alert',
	repeatafter	:	'Action Repeat Interval',
	forceclose	:	'Alert Expiry after',
	groupby		:	'Group By Fields',
	groupwait	:	'Group Wait before Action',
	action		:	'Alert Actions',
	annotations	:	'Alert Annotations',
	label		:	'Labels',
	mutetimes	:	'Silence Time Rules',
	name		:	'Alert Name',
	startsat	:	'Start Date',
	endsat		:	'Deletion Date',
	manualresolve	:	'Is Manual Resolve',
};	

function viewAlertdefFields(key, value)
{
	if (typeof value === 'object' || typeof value === 'boolean') {
		if (key === 'mutetimes' || key === 'action' || key === 'columns' || key === 'severity') {
			value = JSON.stringify(value, null, 4);
			
			return <pre style={{ textAlign : 'left'}}>{value}</pre>;
		}	

		value = JSON.stringify(value);
	}	

	return <span>{value}</span>;
}	

export function viewAlertdef(record, modal = true)
{
	if (record && record.definition) {
		if (modal) {
			Modal.info({
				title : <Title level={4}><em>Alert Definition '{strTruncateTo(record.alertname, 32)}'</em></Title>,
				content : (
					<JSONDescription jsondata={record.definition} titlestr="Alert Definition" column={2} keyNames={alertdefKeyLabels} xfrmDataCB={viewAlertdefFields} />
					),

				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
				okText : 'Close', 
			});
		}
		else {
			return <JSONDescription jsondata={record.definition} titlestr="Alert Definition" column={2} keyNames={alertdefKeyLabels} xfrmDataCB={viewAlertdefFields} />;
		}	
	}
	else {
		return null;
	}	
}

export function AlertdefSearch({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, title, tabKey})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.alertdef,
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
			notification.error({message : "Data Fetch Exception Error for Alert Definition Table", 
						description : `Exception occured while waiting for Alert Definition Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Alert Definition Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs]);

	if (isloading === false && isapierror === false) { 
		const			field = "alertdef";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No Alert Definition found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {

			let		columns;

			columns = getAlertdefColumns(typeof tableOnRow !== 'function' ? viewAlertdef : undefined);

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>List of Alert Definitions</Title>
				<GyTable columns={columns} dataSource={data.alertdef} rowKey="adefid" onRow={tableOnRow} />
				
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


export function alertdefTableTab({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title, extraComp = null})
{
	if (!modal) {
		const			tabKey = `Alertdef_${Date.now()}`;

		CreateTab(title ?? "Alertdef", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<AlertdefSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} title={title} /> 
					</>
				);		
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Alert Definitions",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<AlertdefSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
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


const formItemLayout = {
	labelCol: {
		span: 6,
	},
	wrapperCol: {
		span: 18,
	},
};

const tailFormItemLayout = {
	wrapperCol: {
		span: 18,
		offset: 6,
	},
};

function SeveritySelectOne({action = {}, columns, doneCB})
{
	const [form] 				= Form.useForm();
	const [matchfilt, setMatchfilt]		= useState();

	const onFinish = useCallback((obj) => {
		
		if (!matchfilt || matchfilt.length === 0) {
			notification.error({message : "No Severity Filter", description : "Please specify the dynamic Severity Filter first..."});
			return;
		}

		const sev = {
			level			: obj.level,
			match			: matchfilt,
		};	

		if (typeof doneCB === 'function') {
			doneCB(sev);
		}	

	}, [doneCB, matchfilt]);		

	return (
		<>
		<ErrorBoundary>

		<Form {...formItemLayout} form={form} name="severityone" onFinish={onFinish} >

			<Form.Item name="level" label="Severity Level" initialValue="info" >
				<Radio.Group>
					<Radio.Button value="info">Info</Radio.Button>
					<Radio.Button value="warning">Warning</Radio.Button>
					<Radio.Button value="critical">Critical</Radio.Button>
					<Radio.Button value="debug">Debug</Radio.Button>
				</Radio.Group>
			</Form.Item>

			<Form.Item label="Set Match Filters for this Severity to take effect" >

				{!matchfilt && <SubsysMultiFilters filterCB={(match) => setMatchfilt(match)} linktext="Add Severity Condition Filter" 
					subsysFields={columns} title="Conditional Severity Filters" />}
				{matchfilt && (
					<>
					<Space>
					<Button onClick={() => setMatchfilt()} >Reset Conditional Filter</Button>
					<span>Severity applicable for filter : {matchfilt}</span>
					</Space>
					</>
				)}
				
			</Form.Item>

			<Form.Item {...tailFormItemLayout}>
				<Button type="primary" htmlType="submit" >Add Severity</Button>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);

}


function SeveritySelect({columns, doneCB, modal})
{
	const [form] 				= Form.useForm();
	const [sevarr, setsevarr]		= useState([]);
	const objref 				= useRef(null);

	if (objref.current === null) {
		objref.current = {
			modal		:	null,
		};	
	}

	const onSubmit = (obj) => {
		if (!sevarr || sevarr.length === 0) {
			notification.error({message : "No Severity Updated", description : "Please specify the dynamic severities first..."});
			return;
		}

		if (sevarr.length > 5) {
			notification.error({message : "Max Severity Limit", description : "Max Severity Limit Breached... Please select upto 5 Severity criteria only..."});
			return;
		}
		
		if (typeof doneCB === 'function' && obj) {
			doneCB([...sevarr, { level : obj.fallback }]);
		}	

		if (modal) {
			modal.destroy();
		}	
	};	

	const onaddcb = useCallback((sev) => {
		if (objref.current.modal) {
			objref.current.modal.destroy();
			objref.current.modal = null;
		}
		
		if (safetypeof(sev) === 'object') {
			setsevarr((arr) => [...arr, sev]);
		}
	}, [objref]);

	const onButton = useCallback(() => {
		objref.current.modal = Modal.info({
			title : <span><strong>Add Severity Criterion</strong></span>,
			content : (
				<>
				<SeveritySelectOne columns={columns} doneCB={onaddcb} />
				</>
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
			okText : 'Cancel',
		});
	}, [columns, onaddcb]);	

	useEffect(() => {
		if (objref.current && !objref.current.modal) {
			onButton();
		}	
		
	}, [objref, onButton]);

	return (
		<>

		<ErrorBoundary>

		<Form {...formItemLayout} form={form} name="severity" onFinish={onSubmit} scrollToFirstError >

			<Form.Item label="Dynamic Severity Criterion" >
				<Button onClick={onButton}>Add Dynamic Severity Criterion</Button>
			</Form.Item>


			{sevarr && sevarr.length > 0 &&
			<Form.Item label="Current Severity Criteria" >
				<pre style={{ textAlign : 'left'}}>{JSON.stringify(sevarr, null, 4)}</pre>
			</Form.Item>
			}

			{sevarr && sevarr.length > 0 &&
			<Form.Item name="fallback" label="Fallback Severity if above Criteria fail" initialValue="info" >
				<Radio.Group>
					<Radio.Button value="info">Info</Radio.Button>
					<Radio.Button value="warning">Warning</Radio.Button>
					<Radio.Button value="critical">Critical</Radio.Button>
					<Radio.Button value="debug">Debug</Radio.Button>
				</Radio.Group>
			</Form.Item>
			}

			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button type="primary" htmlType="submit" disabled={sevarr.length === 0}>Submit Severity Criteria</Button>
				<Button onClick={() => setsevarr([])} disabled={sevarr.length === 0}>Reset Severity Criteria</Button>
				</Space>
				</>
			</Form.Item>

		</Form>

		</ErrorBoundary>

		</>
	);
}	

function ActionSelectOne({action, columns, doneCB})
{
	const [form] 				= Form.useForm();
	const [matchfilt, setMatchfilt]		= useState();
	const [iscontinue, setIscontinue]	= useState(true);

	const onFinish = useCallback((obj) => {
		
		const act = {
			name			: obj.name,
			match			: matchfilt && matchfilt.length > 1 ? matchfilt : undefined,
			continue		: obj.continue,
			send_resolved		: obj.send_resolved !== action.send_resolved ? obj.send_resolved : undefined,
		};	

		let			config;

		if (obj.config) {	
			config = {
				to		: obj.config.to && obj.config.to !== action.config.to ? obj.config.to : undefined,
				cc		: obj.config.cc && obj.config.cc !== action.config.cc ? obj.config.cc : undefined,
				bcc		: obj.config.bcc && obj.config.bcc !== action.config.bcc ? obj.config.bcc : undefined,
				subject_prefix	: obj.config.subject_prefix && obj.config.subject_prefix !== action.config.subject_prefix ? obj.config.subject_prefix : undefined,
				channel		: obj.config.channel && obj.config.channel !== action.config.channel ? obj.config.channel : undefined,
			}
		}

		if (config && !isEmptyObj(config, true)) {
			act.config 		= config;
		}	
		
		if (typeof doneCB === 'function') {
			doneCB(act);
		}	

	}, [action, doneCB, matchfilt]);		

	return (
		<>
		<ErrorBoundary>

		<Form {...formItemLayout} form={form} name="action" onFinish={onFinish} scrollToFirstError >

			<Form.Item name="name" label="Action Name" initialValue={action.name} >
				<Input readOnly={true} />
			</Form.Item>

			<Form.Item name="acttype" label="Action Type" initialValue={action.acttype} >
				<Radio.Group disabled={true}>
				<Radio.Button value="email">Email</Radio.Button>
				<Radio.Button value="slack">Slack</Radio.Button>
				<Radio.Button value="pagerduty">Pagerduty</Radio.Button>
				<Radio.Button value="webhook">Custom Webhook</Radio.Button>
				<Radio.Button value="null">None</Radio.Button>
				</Radio.Group>
			</Form.Item>

			<Form.Item label="Set Optional Filters for Action to be fired only on a match" >

				{!matchfilt && <SubsysMultiFilters filterCB={(match) => setMatchfilt(match)} linktext="Add Action Condition Filter" 
					subsysFields={columns} title="Conditional Action Filters" />}
				{matchfilt && (
					<>
					<Space>
					<Button onClick={() => setMatchfilt()} >Reset Conditional Filter</Button>
					<span>Action to be fired for filter : {matchfilt}</span>
					</Space>
					</>
				)}
				
			</Form.Item>

			{action.acttype === 'email' &&
			<>

			<Form.Item name={['config', 'to' ]} label="Comma separated Receipient Email ID(s)" initialValue={action.config?.to} >
				<Input />
			</Form.Item>	
			
			<Form.Item name={['config', 'cc' ]} label="Optional Comma separated cc Email ID(s)" initialValue={action.config?.cc} >
				<Input />
			</Form.Item>	
			
			<Form.Item name={['config', 'bcc' ]} label="Optional Comma separated bcc Email ID(s)" initialValue={action.config?.bcc} >
				<Input />
			</Form.Item>	
			
			<Form.Item name={['config', 'subject_prefix' ]} label="Email Subject Prefix" initialValue={action.config?.subject_prefix} >
				<Input />
			</Form.Item>	
			
			</>
			}

			{action.acttype === 'slack' &&
			<>

			<Form.Item name={['config', 'channel' ]} label="Optional Slack Channel" initialValue={action.config?.channel} >
				<Input />
			</Form.Item>	
			
			</>
			}

			<Form.Item name="send_resolved"  label="Action to be invoked on Alert Resolution / Expiry" valuePropName="checked" initialValue={action.send_resolved} >
				<Switch />
			</Form.Item>
		
			<Form.Item label="Fire Subsequent Actions in Alert definition?" >
				<>
				<Space>

				<Form.Item name="continue"  valuePropName="checked" initialValue={true} noStyle >
					<Switch onChange={setIscontinue} />
				</Form.Item>

				{!matchfilt && !iscontinue &&
					<span>No further Actions can be added to this Alert Definition...</span>
				}

				</Space>

				</>
			</Form.Item>
		
			<Form.Item {...tailFormItemLayout}>
				<Button type="primary" htmlType="submit" >Add Action</Button>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);

}

function ActionSelect({actions, columns, doneCB, modal})
{
	const [actarr, setactarr]		= useState([]);
	const objref 				= useRef(null);

	if (objref.current === null) {
		objref.current = {
			modal		:	null,
		};	
	}

	const onSubmit = () => {
		if (!actarr || actarr.length === 0) {
			notification.error({message : "No Actions Selected", description : "Please select 1 or more actions first..."});
			return;
		}

		if (actarr.length > 8) {
			notification.error({message : "Max Action Limit", description : "Max 8 Action Limit Breached... Please select upto 8 Actions only..."});
			return;
		}
		
		let			fallback;

		for (let act of actarr) {
			if (!act.match) {
				fallback = act;
				break;
			}	
		}	

		if (!fallback) {
			notification.error({message : "No Default Action", 
					description : "All Action seen with Filters set... Please add at least 1 Action without a filter which will act as a Fallback in case the filters do not match..."});
			return;
		}	

		if (typeof doneCB === 'function') {
			doneCB(actarr);
		}	

		if (modal) {
			modal.destroy();
		}	
	};	

	const onaddcb = (act) => {
		if (objref.current.modal) {
			objref.current.modal.destroy();
			objref.current.modal = null;
		}
		
		if (safetypeof(act) === 'object') {
			setactarr([...actarr, act]);
		}
	};


	const tableOnRow = (record, rowIndex) => {
		return {
			onClick: event => {
				objref.current.modal = Modal.info({
					title : <span><strong>Add Alert Action</strong></span>,
					content : (
						<>
						<ActionSelectOne action={record.action} columns={columns} doneCB={onaddcb} />
						</>
						),

					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Cancel',
				});
			}
		};		
	};
	
	if (!actions || !doneCB) {
		return null;
	}	

	const viewSelected = () => {

		if (!actarr || actarr.length === 0) {
			return null;
		}

		const 		value = JSON.stringify(actarr, null, 4);

		return (
			<>
			<Divider orientation="left" plain>
			<span style={{ fontSize : 14 }}><i><strong>Currently Selected Alert Action(s)</strong></i></span>
			</Divider>
			<pre style={{ textAlign : 'left'}}>{value}</pre>
			</>
		);	
	};	
	
	return (
		<>

		<ErrorBoundary>
			<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 30 }} >
			<Title level={4}>List of Alert Actions : Select up to 8 Actions</Title>
			<GyTable columns={getActionColumns()} dataSource={actions} onRow={tableOnRow} rowKey="actionid" />
			</div>
			
			{viewSelected()}

			<div style={{ marginTop: 40, marginBottom: 30 }} >
			<>
			<Space>
			
			<Button onClick={onSubmit} disabled={actarr.length === 0}>Submit Actions</Button>
			<Button onClick={() => setactarr([])} disabled={actarr.length === 0}>Reset Actions</Button>
			
			</Space>
			</>

			</div>
		</ErrorBoundary>

		</>
	);
}	

export function AlertdefConfig({titlestr, doneCB, addTabCB, remTabCB, isActiveTabCB})
{
	const [form] 					= Form.useForm();
	const objref 					= useRef(null);
	const [allActions, setAllActions] 		= useState();
	const [actions, setActions]			= useState();
	const [severity, setSeverity]			= useState("info");
	const [category, setCategory]			= useState('service');
	const [subsys, setSubsys] 			= useState('extsvcstate');
	const [canaggr, setcanagg]			= useState(false);
	const [filterstr, setfilterstr] 		= useState('');
	const [custaggrdef, setcustaggrdef]		= useState();
	const [aggrfilterstr, setaggrfilterstr] 	= useState('');
	const [mutearr, setmutearr] 			= useState();
	const [manualresolve, setManualresolve]		= useState(false);
	const [isgroup, setIsgroup]			= useState(false);
	const [startsAt, setStartsAt] 			= useState();
	const [endsAt, setEndsAt] 			= useState();

	if (objref.current === null) {
		objref.current = {
			subsysobj		:	getSubsysHandlers(subsys),
			customcols		:	null,
			customtablecols		:	null,
		}	
	}

	useEffect(() => {
		const getActions = async () => {

			const conf = {
				url 	: NodeApis.actions,
				method	: 'post',
				data 	: {
					qrytime		: Date.now(),
					timeoutsec 	: 30,
				},	

				timeout	: 30 * 1000,
			};
			
			console.log('Fetching Action List for new Alertdef...');

			try {
				let 		res = await axios(conf);

				validateApi(res.data);

				if ((safetypeof(res.data) === 'array') && safetypeof(res.data[0]) === 'object' && safetypeof(res.data[0].actions) === 'array') { 
					const act = res.data[0].actions;

					if (act.length === 0) {
						Modal.error({
							title : "No Alert Actions Defined", 
							content : "Please define one or more Alert Actions first. Alert Definitions will need to reference those Actions...",
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

					setAllActions(act);
				}
				else {
					Modal.error({title : "Alert Action Fetch Error", content : "Invalid Alert Action Response format during Data fetch. Please retry after some time..."});

					if (typeof doneCB === 'function') {
						try {
							doneCB();
						}
						catch(e) {
						}	
					}	

					setAllActions([]);
					return;
				}	

			}
			catch(e) {
				Modal.error({title : "Alert Action Fetch Exception Error", 
						content : `Exception occured while waiting for Alert Action list : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for Alert Action fetch response : ${e}\n${e.stack}\n`);

				if (typeof doneCB === 'function') {
					try {
						doneCB();
					}
					catch(e) {
					}	
				}	

				return;
			}	
			
		};	

		getActions();

	}, [doneCB]);	

	const onFinish = useCallback(async (obj) => {
		// console.log('Received values of form: ', obj);
		
		if (obj.repeatafter > 24 && obj.repeatunit === 'h') {
			notification.error({message : "Alert Repeat Error", description : "Max Alert Repeat Time Interval is 24 hours. Please reduce the Repeat Interval..."});
			return;
		}	

		if (obj.forceclose > 24 && obj.forceunit === 'h') {
			notification.error({message : "Alert Expiry Error", description : "Max Alert Expiry Time is 24 hours. Please reduce the Expiry Interval..."});
			return;
		}	

		if (obj.alerttype === 'realtime' && !filterstr) {
			notification.error({message : "Filter Missing", description : "Please specify the Mandatory Realtime Filters..."});
			return;
		}	

		if (obj.alerttype !== 'realtime' && !aggrfilterstr) {
			notification.error({message : "Filter Missing", description : "Please specify the Mandatory Post Aggregation Filters..."});
			return;
		}	

		if (!actions || actions.length === 0) {
			notification.error({message : "Action Missing", description : "Please specify the Mandatory Alert Action(s)..."});
			return;
		}	

		const adef = {
			alertname 		: obj.alertname,
			annotations		: obj.annotations ? obj.annotations : undefined,
			subsys			: obj.subsys,
			alerttype		: obj.alerttype,
			queryperiod		: obj.alerttype !== 'realtime' ? `${obj.queryperiod}m` : undefined,
			queryevery		: obj.alerttype !== 'realtime' ? `${obj.queryevery}m` : undefined,
			filter			: filterstr ? filterstr : undefined,
			aggrfilter		: obj.alerttype !== 'realtime' ? aggrfilterstr : undefined, 
			aggroper		: obj.aggroper,
			columns			: custaggrdef ? custaggrdef : undefined,
			numcheckfor		: Number(obj.numcheckfor),
			severity		: severity,
			action			: actions,
			repeatafter		: `${obj.repeatafter}${obj.repeatunit}`, 
			forceclose		: `${obj.forceclose}${obj.forceunit}`, 
			manualresolve		: obj.manualresolve,
			mutetimes		: mutearr && mutearr.length > 0 ? mutearr : undefined,
			groupby			: obj.groupby,
			groupwait		: obj.groupby ? `${obj.groupwait}${obj.groupunit}` : undefined,
			label			: obj.label ? splitAndTrim(obj.label) : undefined,
			startsat		: startsAt ? startsAt : undefined,
			endsat			: endsAt ? endsAt : undefined,
		};	

		// Now send the alertdef to the server

		const conf = {
			url 	: NodeApis.alertdef + '/add',
			method	: 'post',
			data 	: adef,
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
						title : 'Alert Definition add Failed' + (apidata[0].error === 409 ? ' due to conflict with existing Definition Name' : ''),
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : 'Alert Definition Add Failed',
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : 'Alert Definition Add Success',
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
				title 	: 'Alert Definition Add Failed',
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Alert Definition Add response : ${e}\n${e.stack}\n`);
		}	

	}, [doneCB, custaggrdef, filterstr, aggrfilterstr, severity, actions, mutearr, startsAt, endsAt]);

	const onNewSubsystem = useCallback((newsub) => {
		setSubsys(newsub);
		objref.current.subsysobj = getSubsysHandlers(newsub);
			
		objref.current.customcols 	= null;
		objref.current.customtablecols 	= null;

		setfilterstr();
		setaggrfilterstr();
		setcustaggrdef();	

	}, [objref]);	

	const onCategoryChange = useCallback((e) => { 
		const 		val = e.target.value;
		const		newsub = getAlertSubsysFromCategory(val)[0]?.value;

		setCategory(val); 
		
		onNewSubsystem(newsub);

		if (newsub) {
			form.setFieldsValue({subsys : newsub});
		}
	}, [form, onNewSubsystem]);	

	const onSubsysChange = useCallback((e) => { 
		const 		val = e.target.value;

		onNewSubsystem(val); 
	}, [onNewSubsystem]);	

	const onAlertTypeChange = useCallback((e) => {
		const value = e.target.value;

		if (value === 'realtime') {
			objref.current.customcols 	= null;
			objref.current.customtablecols 	= null;
			
			setcanagg(false);
			setaggrfilterstr();
			setcustaggrdef();	
		}	
		else {
			setcanagg(true);
		}	

	}, [objref]);	

	const onfiltercb = useCallback((newfilter) => {
		setfilterstr(newfilter);
	}, []);

	const onaggrfiltercb = useCallback((newfilter) => {
		setaggrfilterstr(newfilter);
	}, []);

	const onCustomAggr = useCallback((newcolarr, newfieldarr, newtablecolarr) => {
		objref.current.customcols 	= newfieldarr;
		objref.current.customtablecols 	= newtablecolarr;

		setcustaggrdef(newcolarr);

		setaggrfilterstr();
	}, [objref]);	

	const onFilterStrChange = useCallback(({ target: { value } }) => {
		setfilterstr(value);
	}, []);

	const onAggrFilterStrChange = useCallback(({ target: { value } }) => {
		setaggrfilterstr(value);
	}, []);

	const onTestTimeChange = useCallback((dateObjs) => {
		if (safetypeof(dateObjs) !== 'array') {
			return;
		}

		if (!objref.current?.subsysobj?.tablecb) {
			return;
		}

		objref.current.subsysobj.tablecb(
			{
				starttime 		: dateObjs[0].format(),
				endtime 		: dateObjs[1].format(),
				useAggr			: canaggr ? true : undefined, 
				aggrMin			: canaggr ? form.getFieldValue('queryperiod') : undefined, 
				aggrType		: canaggr ? form.getFieldValue('aggroper') : undefined,
				filter 			: filterstr, 
				aggrfilter		: aggrfilterstr, 
				maxrecs			: 10000,
				customColumns		: custaggrdef,
				customTableColumns	: custaggrdef ? objref.current.customtablecols : undefined,
				addTabCB, 
				remTabCB, 
				isActiveTabCB,
			}
		);

	}, [objref, canaggr, form, filterstr, aggrfilterstr, custaggrdef, addTabCB, remTabCB, isActiveTabCB]);	

	const onstartsatCB = useCallback((date, dateString) => {
		if (!date || !dateString) {
			setStartsAt();
		}

		setStartsAt(dateString);
	}, []);


	const onendsatCB = useCallback((date, dateString) => {
		if (!date || !dateString) {
			setEndsAt();
		}

		setEndsAt(dateString);
	}, []);


	if (allActions === undefined) {
		return <LoadingAlert message="Fetching List of Alert Actions" />;
	}	
	else if ((safetypeof(allActions) !== 'array') || (allActions.length === 0)) {
		return <Alert type="error" showIcon message="Invalid or No Action data found on server. Please add Valid Actions first..." description=<Empty /> />;
	}	

	let 			SubsysFilterCB, SubsysAggrFilterCB, outputfields;
	
	if (objref.current.subsysobj) {
		SubsysFilterCB = objref.current.subsysobj.filtercb;	
		
		if (canaggr) {
			if (objref.current.customcols && custaggrdef) {
				SubsysAggrFilterCB = SubsysMultiFilters;
				outputfields = objref.current.customcols;
			}	
			else {
				SubsysAggrFilterCB = objref.current.subsysobj.aggrfiltercb;
				outputfields = objref.current.subsysobj.aggrfields;
			}	
		}
		else {
			outputfields = objref.current.subsysobj.fields;
		}	
	}

	const onSeverityChange = (e) => {
		const value		= e.target.value;

		if (value !== 'dynamic') {
			setSeverity(value);
			return;
		}	

		const modal = Modal.info();

		modal.update({	
			title : <Title level={4}><em>Dynamic Alert Severity</em></Title>,
			content : <SeveritySelect doneCB={setSeverity} columns={outputfields} modal={modal} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'primary',
		});
		
	};	

	return (
		<>
		<ErrorBoundary>

		{titlestr && <Title level={4} style={{ textAlign : 'center', marginBottom : 30, }} ><em>{titlestr}</em></Title>}
		
		<Form {...formItemLayout} form={form} name="alertdef" onFinish={onFinish} scrollToFirstError >

			<Form.Item name="alertname" label="Alert Definition Name" 
					rules={[ { required : true, message: 'Please input the Alert Definition Name', whitespace: true, max : 256 }, ]} >
				<Input autoComplete="off" style={{ maxWidth : 400 }} />
			</Form.Item>

			<Form.Item name="annotations" label="Alert Description" rules={[ { whitespace: true, max : 1024 }, ]} >
				<Input autoComplete="off" style={{ maxWidth : 800 }} />
			</Form.Item>

			<Form.Item name="category" label="Subsystem Category" initialValue="service" >
				<Radio.Group onChange={onCategoryChange}>
				{getAlertSubsysCategories().map((item) => (
					<Radio.Button key={item.value} value={item.value}>{item.name}</Radio.Button>
				))}
				</Radio.Group>
			</Form.Item>

			<Form.Item name="subsys" label="Subsystem Name"  initialValue="extsvcstate" >
				<Radio.Group onChange={onSubsysChange}>
				{getAlertSubsysFromCategory(category).map((item) => (
					<Radio.Button key={item.value} value={item.value}>{item.name}</Radio.Button>
				))}
				</Radio.Group>
			</Form.Item>
			
			<Form.Item name="alerttype" label="Type of Alert" initialValue="realtime" >
				<Radio.Group onChange={onAlertTypeChange}>
					<Radio.Button value="realtime">Realtime</Radio.Button>
					<Radio.Button value="dbaggr">DB Aggregated</Radio.Button>
				</Radio.Group>
			</Form.Item>

			{SubsysFilterCB &&
			<Form.Item label={canaggr ? "Pre-Aggregation Filters" : "Mandatory Realtime Filters" } >
				{!filterstr && <SubsysFilterCB filterCB={onfiltercb} linktext={canaggr ? "Set Pre-Aggregation Multi Filters" : "Set Multi Filters"} quicklinktext="Set Quick Filters" />}
				{filterstr && (
					<Button onClick={() => setfilterstr()} >{canaggr ? "Reset Pre-Aggregation Filters" : "Reset Filters"}</Button>
				)}
				
			</Form.Item>
			}

			{filterstr &&
			<Form.Item label={canaggr ? "Current Editable Pre-Aggregation Filters" : "Current Editable Filters"} >
				<TextArea value={filterstr} onChange={onFilterStrChange} autoSize={{ minRows: 1, maxRows: 6 }} style={{ maxWidth : '80%' }} />
			</Form.Item>
			}

			{canaggr && 
			<Form.Item name="aggroper" label="Default Numerical Aggregation Operator" initialValue="avg">
				<Radio.Group>
				<Radio.Button value='avg'>Average of Interval</Radio.Button>
				<Radio.Button value='max'>Max of Interval</Radio.Button>
				<Radio.Button value='min'>Min of Interval</Radio.Button>
				<Radio.Button value='sum'>Sum of Interval</Radio.Button>
				</Radio.Group>
			</Form.Item>
			}

			{SubsysAggrFilterCB && canaggr && 
			<Form.Item label="Optional Custom Aggregation Fields" >
				{!custaggrdef && 
					<CustomAggrColModal subsysFields={getFieldsExcludingHost(objref.current.subsysobj.fields)} 
							aggrsubsysFields={objref.current.subsysobj.aggrfields} doneCB={onCustomAggr} 
							addtime={isFieldPresent(objref.current.subsysobj.fields, 'time')} 
							addinrecs={isFieldPresent(objref.current.subsysobj.aggrfields, 'inrecs')} />}
				{custaggrdef &&
					<>
					<Space>
					<Button onClick={() => { onCustomAggr(undefined, null, null); }} >Reset Custom Aggregation Fields</Button>
					<span>({objref.current.customcols?.length} Custom Columns set...)</span> 
					</Space>
					</>
				}
			</Form.Item>
			}

			{SubsysAggrFilterCB && canaggr && 
			<Form.Item label="Mandatory Post-Aggregation Filters" >

				{!aggrfilterstr && <SubsysAggrFilterCB filterCB={onaggrfiltercb} linktext="Set Post Aggregation Filters" 
					subsysFields={custaggrdef ? objref.current.customcols : undefined} title="Aggregation Filters" />}
				{aggrfilterstr && (
					<Button onClick={() => setaggrfilterstr()} >Reset Post Aggregation Filters</Button>
				)}
				
			</Form.Item>
			}

			{aggrfilterstr && canaggr &&
			<Form.Item label="Current Editable Post Aggregation Filters" >
				<TextArea value={aggrfilterstr} onChange={onAggrFilterStrChange} autoSize={{ minRows: 1, maxRows: 6 }} style={{ maxWidth : '80%' }} />
			</Form.Item>
			}

			{canaggr &&
			<Form.Item label="DB Query Window (Period) for each iteration">
				<Space>
				<Form.Item name="queryperiod" noStyle initialValue="1">
					<InputNumber min={1} />
				</Form.Item>	
				
				<span> minute </span>
				</Space>
			</Form.Item>
			}
			
			{canaggr &&
			<Form.Item label="DB Query to be executed at Repeated Intervals of">
				<Space>
				<Form.Item name="queryevery" noStyle initialValue="1">
					<InputNumber min={1} />
				</Form.Item>	
				
				<span> minute </span>
				</Space>
			</Form.Item>
			}

			<Form.Item name="numcheckfor" label="# Consecutive Filter Matches for Alert to be fired" initialValue={1} >
				<InputNumber min={1} max={60} />
			</Form.Item>	

			{((aggrfilterstr && canaggr) || (!canaggr && filterstr)) &&
				<Form.Item label="Alert Filter Test on Historical Data">
					<Space>

					<TimeRangeButton onChange={onTestTimeChange} linktext="Test Alert Filters" 
						title={(
							<>
							<span style={{ fontSize : 16 }}>Time Range for Alert Filter Test with Historical Data (Ignoring Consecutive match count)</span>
							<div style={{ marginBottom : 30 }} />
							</>)} 
						disableFuture={true} />

					<span>(Ideally, the Alert Filters should return only a few rows for each time interval...)</span>

					</Space>
				</Form.Item>
			}

			<Form.Item label="Alert Severity Level">
				<>
				<Space>

				<Form.Item name="aseverity" initialValue="info" noStyle >
					<Radio.Group onChange={onSeverityChange}>
					<Radio.Button value="info">Info</Radio.Button>
					<Radio.Button value="warning">Warning</Radio.Button>
					<Radio.Button value="critical">Critical</Radio.Button>
					<Radio.Button value="debug">Debug</Radio.Button>
					<Radio.Button value="dynamic">Dynamic as per Alert data</Radio.Button>
					</Radio.Group>
				</Form.Item>

				{safetypeof(severity) === 'array' &&
					<span>({severity.length} Dynamic Criteria set...)</span>
				}

				</Space>
				</>
			</Form.Item>	
				

			<Form.Item label="Mandatory Alert Actions">
				{!actions && outputfields &&
					<ButtonModal buttontext="Select Alert Actions to be fired" okText="Cancel" 
							title={<Title level={4}><em>Alert Definition Actions</em></Title>} maskClosable={false} width='90%' 
							contentCB={(modal) => <ActionSelect actions={allActions} columns={[...alertsfields, ...outputfields]} doneCB={setActions} 
											modal={modal} />} />}	
				{actions && actions.length > 0 &&
					<>
					<Space>
					<Button onClick={() => setActions()} >Reset Selected Actions</Button>
					<span>({actions.length} Action(s) Set...)</span>
					</Space>
					</>}
			</Form.Item>	

			<Form.Item label="Alert Action to be Repeated (if not Resolved) after duration">
				<Space>

				<Form.Item name="repeatafter" noStyle initialValue="2">
					<InputNumber min={0} max={59} />
				</Form.Item>	

				<Form.Item name="repeatunit" noStyle initialValue="h">
					<Radio.Group>
					<Radio.Button value="m">Minutes</Radio.Button>
					<Radio.Button value="h">Hours</Radio.Button>
					</Radio.Group>
				</Form.Item>	
				
				<span>(Set to 0 if no Repeat Actions needed)</span>

				</Space>
			</Form.Item>

			<Form.Item label="Alert will Expire (if not Resolved) after duration">
				<Space>
				<Form.Item name="forceclose" noStyle initialValue="10">
					<InputNumber min={1} max={59} />
				</Form.Item>	

				<Form.Item name="forceunit" noStyle initialValue="h">
					<Radio.Group>
					<Radio.Button value="m">Minutes</Radio.Button>
					<Radio.Button value="h">Hours</Radio.Button>
					</Radio.Group>
				</Form.Item>	

				</Space>
			</Form.Item>

			<Form.Item label="Alert to be Manually Resolved ?" >
				<>
				<Space>

				<Form.Item name="manualresolve" valuePropName="checked" initialValue={false} noStyle >
				<Switch onChange={setManualresolve} />
				</Form.Item>

				{manualresolve && <span>Alert will be kept Active till a Manual Resolve Request seen or till Alert Expiry...</span>}

				</Space>
				</>
			</Form.Item>

			<Form.Item name="isgroup" label="Group Alerts to reduce Action Notifications ?" valuePropName="checked" initialValue={false} >
				<Switch onChange={setIsgroup} />
			</Form.Item>

			{isgroup && outputfields &&
			<Form.Item name="groupby" label="Fields to Group Alerts By" initialValue={['alertname']}  >
				<Select mode="multiple" placeholder="Please select the fields to group from" style={{ width: '70%' }} >
					{[...alertsfields, ...outputfields].map(item => (
					<Select.Option key={item.field} value={item.field}>
						{item.desc}
					</Select.Option>
					))}
				</Select>
			</Form.Item>
			}

			{isgroup && 
			<Form.Item label="Alert Group Wait Duration after which Action will be executed">
				<Space>
				<Form.Item name="groupwait" noStyle initialValue="30">
					<InputNumber min={1} max={60} />
				</Form.Item>	

				<Form.Item name="groupunit" noStyle initialValue="s">
					<Radio.Group>
					<Radio.Button value="s">Seconds</Radio.Button>
					<Radio.Button value="m">Minutes</Radio.Button>
					</Radio.Group>
				</Form.Item>	

				</Space>
			</Form.Item>
			}

			<Form.Item name="label" label="Optional comma separated Labels" >
				<Input style={{ maxWidth : 300 }} />
			</Form.Item>
		
			<Form.Item label="Optional Silence Date/Times">
				{!mutearr && 
					<ButtonModal buttontext="Set Date/Times when Alert should be Silenced" okText="Cancel" 
							title={<Title level={4}><em>Alert Silencing Rules</em></Title>} maskClosable={false} width='90%' 
							contentCB={(modal) => <SilenceRules doneCB={setmutearr} modal={modal} />} />}	
				{mutearr && mutearr.length > 0 &&
					<>
					<Space>
					<Button onClick={() => setmutearr()} >Reset Silence Date/Times</Button>
					<span>({mutearr.length} Silence Rule(s) Set...)</span>
					</Space>
					</>}
			</Form.Item>	

		
			<Form.Item label="Optional Alert Definition Activation (Start) Time" >
				<>
				<Space>
				<DateTimeZonePicker onChange={onstartsatCB} cbonreset={true} disabledDate={disablePastTimes} placeholder="Start Time" />
				{startsAt && <span>The Alert Definition will be Activated at time {startsAt}</span>}
				</Space>
				</>
			</Form.Item>
		
			<Form.Item label="Optional Alert Definition Deletion Time" >
				<>
				<Space>
				<DateTimeZonePicker onChange={onendsatCB} cbonreset={true} disabledDate={disablePastTimes} placeholder="Deletion Time" />
				{endsAt && <span>The Alert Definition will be Deleted at time {endsAt}</span>}
				</Space>
				</>
			</Form.Item>
		
			<Form.Item {...tailFormItemLayout}>
				<Button type="primary" htmlType="submit">Submit</Button>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);
}


export function AlertdefDashboard({filter, addTabCB, remTabCB, isActiveTabCB})
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
		console.log(`Alertdef Dashboard initial Effect called...`);

		return () => {
			console.log(`Alertdef Dashboard destructor called...`);
		};	
	}, []);


	const deleteDisableCB = useCallback(async (record, oper) => {
		
		if (!record || !record.adefid) {
			return;
		}

		let			conf;

		if (oper === 'delete') {
			conf = {
				url 	: NodeApis.alertdef + `/${record.adefid}`,
				method	: 'delete',
				validateStatus : function (status) {
					return (status < 300) || (status === 400) || (status === 410); 
				},
			};
		}	
		else {
			conf = {
				url 	: NodeApis.alertdef + '/update',
				method	: 'post',
				data	: {
					adefid		:	record.adefid,
					disabled	:	(oper === 'disable'),				
				},	
				validateStatus : function (status) {
					return (status < 300) || (status === 400) || (status === 410); 
				},
			};
		}	

		try {
			const 			res = await axios(conf);
			const			apidata = res.data;
			const 			type = safetypeof(apidata);

			if (type === 'array' && (safetypeof(apidata[0]) === 'object')) {
				if (apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
					Modal.error({
						title : `Alert Definition ${oper} Failed`,
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : `Alert Definition ${oper} Failed`,
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : `Alert Definition ${oper} Successful`,
						content : apidata[0].msg,
					});

					const			pdata = objref.current.prevdata;

					if (safetypeof(pdata) === 'array' && pdata.length > 0 && safetypeof(pdata[0].alertdef) === 'array') { 
						objref.current.nextfetchtime = Date.now() + 2000;
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
				title : `Alert Definition ${oper} Failed`,
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Alert Definition ${oper} response : ${e}\n${e.stack}\n`);
		}	


	}, [objref]);	

	const onAddCB = useCallback(() => {
		const		tabKey = addAlertdefKey;

		const		adeftab = () => (
			<>
			<ErrorBoundary>
			<AlertdefConfig addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} doneCB={() => setTimeout(() => remTabCB(tabKey), 3000)} />
			</ErrorBoundary>
			</>
		);	

		addTabCB('New Alertdef', adeftab, tabKey);

	}, [addTabCB, remTabCB, isActiveTabCB]);	
	
	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 30) => {

		return {
			url 	: NodeApis.alertdef,
			method	: 'post',
			data : {
				qrytime		: Date.now(),
				timeoutsec 	: timeoutsec,
				filter		: filter,
				
				options		: {
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

				console.log(`Fetching Alertdef List for config ${JSON.stringify(conf)}`);

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
			console.log(`Destructor called for Alert definition interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, getaxiosconf]);	
	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<Button onClick={onAddCB}>Add New Alert Definition</Button>

			<Button onClick={() => {objref.current.nextfetchtime = Date.now()}}>Refresh Alert Definition List</Button>

			</div>
			</>
		);
	};


	let			hdrtag = null, bodycont = null, filtertag = null;

	if (filter) {
		filtertag = <Tag color='cyan'>Filters Set</Tag>;
	}	

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && safetypeof(normdata[0]) === 'object' && safetypeof(normdata[0].alertdef) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		const			columns = getAlertdefColumns(viewAlertdef, deleteDisableCB);

		return (
			<>
			{alertdata}

			{optionDiv()}

			<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 30 }} >
			<Title level={4}>List of Alert Definitions</Title>
			<GyTable columns={columns} dataSource={normdata[0].alertdef} rowKey="adefid" scroll={getTableScroll()} />
			</div>

			</>
		);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && safetypeof(data[0].alertdef) === 'array') { 
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

			console.log(`Alertdef Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Alertdef Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

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
		<Title level={4}><em>Alert Definitions{ filter ? ' with input filters' : ''}</em></Title>
		{hdrtag} {filtertag}

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);
}

