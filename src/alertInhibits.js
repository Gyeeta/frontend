
import 			React, {useState, useEffect, useRef, useCallback} from 'react';
import			{Button, Input, Select, Space, Form, Typography, Tag, Alert, Modal, Popconfirm, notification, Empty} from 'antd';
import 			{CheckSquareTwoTone, CloseOutlined} from '@ant-design/icons';

import 			axios from 'axios';

import 			{GyTable} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, timeDiffString, strTruncateTo, JSONDescription, useFetchApi, LoadingAlert, CreateTab} from './components/util.js';
import 			{SubsysMultiFilters, MultiFilters, hostfields} from './multiFilters.js';
import			{alertsfields} from './alertDashboard.js';

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;

export const inhibitfields = [
	{ field : 'inhid',		desc : 'Inhibit ID',			type : 'string',	subsys : 'inhibits',	valid : null, },
	{ field : 'inhname',		desc : 'Inhibit Name',			type : 'string',	subsys : 'inhibits',	valid : null, },
	{ field : 'tcreated',		desc : 'Creation Time',			type : 'timestamptz',	subsys : 'inhibits',	valid : null, },
	{ field : 'disabled',		desc : 'Is disabled?',			type : 'boolean',	subsys : 'inhibits',	valid : null, },
	{ field : 'inhibit',		desc : 'Inhibit Config',		type : 'string',	subsys : 'inhibits',	valid : null, },
];

function getInhibitColumns(viewCB, deleteDisableCB)
{
	const		colarr = [
	{
		title :		'Inhibit Name',
		key :		'inhname',
		dataIndex :	'inhname',
		gytype : 	'string',
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
						<Popconfirm title="Do you want to Disable this Inhibit?" onConfirm={() => deleteDisableCB(record, 'disable')}>
							<Button type="link">Disable</Button>
						</Popconfirm>		
						)}

						{record.disabled && (
						<Popconfirm title="Do you want to Enable this Inhibit?" onConfirm={() => deleteDisableCB(record, 'enable')}>
							<Button type="link">Enable</Button>
						</Popconfirm>		
						)}

						<Popconfirm title="Do you want to Delete this Inhibit?" onConfirm={() => deleteDisableCB(record, 'delete')}>
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

export function InhibitMultiQuickFilter({filterCB, linktext})
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
			title : <Title level={4}>Alert Inhibit Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={inhibitfields} title='Alert Inhibit Filters' />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return (<Button onClick={multifilters} >{linktext ?? "Inhibit Filters"}</Button>);	
}	

const inhibitKeyLabels = 
{
	src_match	: 	'Source Match Filter',
	target_match	:	'Target Match Filter',
	name		:	'Inhibit Name',
	equal_cols	:	'Fields that should be same',
};	

function viewInhibit(record)
{
	if (record && record.inhibit) {
		Modal.info({
			title : <Title level={4}><em>Inhibit '{strTruncateTo(record.inhname, 32)}'</em></Title>,
			content : (
				<JSONDescription jsondata={record.inhibit} titlestr="Inhibit Definition" column={1} keyNames={inhibitKeyLabels} />
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
			okText : 'Close', 
		});
	}
	else {
		return null;
	}	
}

export function InhibitsSearch({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, titlestr, tabKey})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.inhibits,
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
			doFetch({config : conf, xfrmresp : xfrmresp});
		}
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Inhibit Table", 
						description : `Exception occured while waiting for Inhibit Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Inhibit Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs]);

	if (isloading === false && isapierror === false) { 
		const			field = "inhibits";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No Inhibit Definition seen..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {

			let		columns;

			columns = getInhibitColumns(typeof tableOnRow !== 'function' ? viewInhibit : undefined);

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr ?? 'List of Inhibits'}</Title>
				<GyTable columns={columns} dataSource={data.inhibits} rowKey="inhid" onRow={tableOnRow} />
				
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


export function inhibitsTableTab({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title, titlestr, extraComp = null})
{
	let			tabKey;

	const getComp = () => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<InhibitsSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} titlestr={titlestr} /> 
					</>	
				);
			};

	if (!modal) {
		const			tabKey = `Inhibit_${Date.now()}`;

		CreateTab(title ?? "Inhibits", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Inhibits",

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
		span: 8,
	},
	wrapperCol: {
		span: 18,
	},
};

const tailFormItemLayout = {
	wrapperCol: {
		span: 18,
		offset: 8,
	},
};


export function InhibitConfig({doneCB, titlestr})
{
	const [form] 				= Form.useForm();
	const [srcmatch, setsrcmatch]		= useState();
	const [tgtmatch, settgtmatch]		= useState();

	const onFinish = useCallback(async (values) => {
		// console.log('Received values of form: ', values);
		
		if (!srcmatch) {
			notification.error({message : "Source Match Filter", description : "Inhibit Source Match Filter missing. Please set the Source filters..."});
			return;
		}	

		if (!tgtmatch) {
			notification.error({message : "Target Match Filter", description : "Inhibit Target Alert Match Filter missing. Please set the Target filters..."});
			return;
		}	

		const obj = {
			name 		: values.name,
			src_match	: srcmatch,
			target_match	: tgtmatch,
			equal_cols	: values.equal_cols,
		};	

		// Now send the inibit to the server

		const conf = {
			url 	: NodeApis.inhibits + '/add',
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
						title : 'Inhibit add Failed' + (apidata[0].error === 409 ? ' due to conflict with existing Inhibit Name' : ''),
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : 'Inhibit Add Failed',
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : 'Inhibit Add Success',
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
				title 	: 'Inhibit Add Failed',
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Inhibit Add response : ${e}\n${e.stack}\n`);
		}	
	}, [doneCB, srcmatch, tgtmatch]);
	

	return (
		<>
		<ErrorBoundary>

		{titlestr && <Title level={4} style={{ textAlign : 'center', marginBottom : 30, }} ><em>{titlestr}</em></Title>}
		
		<Form {...formItemLayout} form={form} name="inhibit" onFinish={onFinish} >

			<Form.Item name="name" label="Inhibit Name" 
					rules={[ { required : true, message: 'Please input the Alert Inhibit Name!', whitespace: true, max : 256 }, ]} >
				<Input autoComplete="off"  style={{ maxWidth: 200 }} />
			</Form.Item>

			<Form.Item label="Mandatory Inhibitor (Source) Alert Match Filters" >
				{!srcmatch && <SubsysMultiFilters subsysFields={alertsfields} useHostFields={true} 
								filterCB={setsrcmatch} title="Inhibitor Source Match Filters" linktext="Add Match Filters for Alerts to act as Inhibitors" />}
				{srcmatch && <Button onClick={() => setsrcmatch()} >Reset Source Match Filter : {strTruncateTo(srcmatch, 128)}</Button>}
			</Form.Item>

			<Form.Item label="Mandatory Inhibited Target Alert Match Filters" >
				{!tgtmatch && <SubsysMultiFilters subsysFields={alertsfields} useHostFields={true} 
								filterCB={settgtmatch} title="Inhibited Target Match Filters" linktext="Add Match Filters for Target Alerts to be Inhibited" />}
				{tgtmatch && <Button onClick={() => settgtmatch()} >Reset Target Match Filter : {strTruncateTo(tgtmatch, 128)}</Button>}
			</Form.Item>

			<Form.Item name="equal_cols" label="Optional Fields which must be same in Source and Target Alerts" >
				<Select mode="multiple" placeholder="Optional fields which must be same for the Target Alert to be Inhibited" style={{ width: '70%' }} >
					{[...alertsfields, ...hostfields].map(item => (
					<Select.Option key={item.field} value={item.field}>
						{item.desc}
					</Select.Option>
					))}
				</Select>
			</Form.Item>

			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button type="primary" htmlType="submit" disabled={!srcmatch || !tgtmatch}>Submit</Button>
				</Space>
				</>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);

}

export function InhibitDashboard({filter})
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
		console.log(`Inhibit Dashboard initial Effect called...`);

		return () => {
			console.log(`Inhibit Dashboard destructor called...`);
		};	
	}, []);


	const deleteDisableCB = useCallback(async (record, oper) => {
		
		if (!record || !record.inhid) {
			return;
		}

		let			conf;

		if (oper === 'delete') {
			conf = {
				url 	: NodeApis.inhibits + `/${record.inhid}`,
				method	: 'delete',
				validateStatus : function (status) {
					return (status < 300) || (status === 400) || (status === 410); 
				},
			};
		}	
		else {
			conf = {
				url 	: NodeApis.inhibits + '/update',
				method	: 'post',
				data	: {
					inhid		:	record.inhid,
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
						title : `Inhibit ${oper} Failed`,
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : `Inhibit ${oper} Failed`,
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : `Inhibit ${oper} Successful`,
						content : apidata[0].msg,
					});

					const			pdata = objref.current.prevdata;

					if (safetypeof(pdata) === 'array' && pdata.length > 0 && safetypeof(pdata[0].inhibits) === 'array') { 
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
				title : `Inhibit ${oper} Failed`,
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Inhibit ${oper} response : ${e}\n${e.stack}\n`);
		}	


	}, [objref]);	

	const onAddCB = useCallback(() => {
		const modal = Modal.info();

		modal.update({	
			title : <Title level={4}><em>New Alert Inhibit</em></Title>,
			content : <InhibitConfig doneCB={() => setTimeout(() => {modal.destroy(); objref.current.nextfetchtime = Date.now();}, 1000)} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'primary',
		});	
	}, [objref]);	
	
	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 30) => {

		return {
			url 	: NodeApis.inhibits,
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

				console.log(`Fetching Inhibit List for config ${JSON.stringify(conf)}`);

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
			console.log(`Destructor called for Inhibit interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, getaxiosconf]);	
	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<Button onClick={onAddCB}>Add New Inhibit</Button>

			<Button onClick={() => {objref.current.nextfetchtime = Date.now()}}>Refresh Inhibit List</Button>

			</div>
			</>
		);
	};


	let			hdrtag = null, bodycont = null, filtertag = null;

	if (filter) {
		filtertag = <Tag color='cyan'>Filters Set</Tag>;
	}	

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && safetypeof(normdata[0]) === 'object' && safetypeof(normdata[0].inhibits) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		const			columns = getInhibitColumns(viewInhibit, deleteDisableCB);

		return (
			<>
			{alertdata}

			{optionDiv()}

			<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 30 }} >
			<Title level={4}>List of Alert Inhibits</Title>
			<GyTable columns={columns} dataSource={normdata[0].inhibits} rowKey="inhid" scroll={{ x: objref.current.isrange ? 1100 : undefined }} />
			</div>

			</>
		);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && safetypeof(data[0].inhibits) === 'array') { 
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

			console.log(`Inhibit Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Inhibit Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

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
		<Title level={4}><em>Alert Inhibits{ filter ? ' with input filters' : ''}</em></Title>
		{hdrtag} {filtertag}

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);
}

