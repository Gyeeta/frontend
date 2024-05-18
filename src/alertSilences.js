
import 			React, {useState, useEffect, useRef, useCallback} from 'react';
import			{Button, Input, Switch, Select, Space, Form, Typography, Tag, Alert, Modal, Popconfirm, notification, Tooltip, Empty} from 'antd';
import 			{CheckSquareTwoTone, CloseOutlined} from '@ant-design/icons';

import 			axios from 'axios';

import 			{GyTable} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, timeDiffString, splitAndTrim, strTruncateTo, JSONDescription, useFetchApi, LoadingAlert, CreateTab} from './components/util.js';
import 			{SubsysMultiFilters, MultiFilters} from './multiFilters.js';
import			{tzOffsetsArray, DateTimeZonePicker, disablePastTimes} from './components/dateTimeZone.js';
import			{alertsfields} from './alertDashboard.js';

const	 		{TextArea} = Input;
const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;

export const silencefields = [
	{ field : 'silid',		desc : 'Silence ID',			type : 'string',	subsys : 'silences',	valid : null, },
	{ field : 'silname',		desc : 'Silence Name',			type : 'string',	subsys : 'silences',	valid : null, },
	{ field : 'tcreated',		desc : 'Creation Time',			type : 'timestamptz',	subsys : 'silences',	valid : null, },
	{ field : 'disabled',		desc : 'Is disabled?',			type : 'boolean',	subsys : 'silences',	valid : null, },
	{ field : 'silence',		desc : 'Silence Config',		type : 'string',	subsys : 'silences',	valid : null, },
];

function getSilenceColumns(viewCB, deleteDisableCB)
{
	const		colarr = [
	{
		title :		'Silence Name',
		key :		'silname',
		dataIndex :	'silname',
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
						<Popconfirm title="Do you want to Disable this Silence?" onConfirm={() => deleteDisableCB(record, 'disable')}>
							<Button type="link">Disable</Button>
						</Popconfirm>		
						)}

						{record.disabled && (
						<Popconfirm title="Do you want to Enable this Silence?" onConfirm={() => deleteDisableCB(record, 'enable')}>
							<Button type="link">Enable</Button>
						</Popconfirm>		
						)}

						<Popconfirm title="Do you want to Delete this Silence?" onConfirm={() => deleteDisableCB(record, 'delete')}>
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

export function SilenceMultiQuickFilter({filterCB, linktext})
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
			title : <Title level={4}>Alert Silence Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={silencefields} title='Alert Silence Filters' />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return (<Button onClick={multifilters} >{linktext ?? "Silence Filters"}</Button>);	
}	

const silenceKeyLabels = 
{
	match		: 	'Match Filter',
	mutetimes	:	'Silence Time Rules',
	name		:	'Silence Name',
	endsat		:	'Silence Deletion Date',

};	

function viewSilenceFields(key, value)
{
	if (key === 'mutetimes') {
		value = JSON.stringify(value, null, 4);
	}	
	else if (typeof value === 'object' || typeof value === 'boolean') {
		value = JSON.stringify(value);
	}	

	return <pre style={{ textAlign : 'left'}}>{value}</pre>;
}	

function viewSilence(record)
{
	if (record && record.silence) {
		Modal.info({
			title : <Title level={4}><em>Silence '{strTruncateTo(record.silname, 32)}'</em></Title>,
			content : (
				<JSONDescription jsondata={record.silence} titlestr="Silence Definition" column={1} keyNames={silenceKeyLabels} xfrmDataCB={viewSilenceFields} />
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

export function SilencesSearch({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, title, tabKey})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.silences,
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
			notification.error({message : "Data Fetch Exception Error for Silences Table", 
						description : `Exception occured while waiting for Silences Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Silences Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs]);

	if (isloading === false && isapierror === false) { 
		const			field = "silences";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else if (data[field].length === 0) {
			hinfo = <Alert type="info" showIcon message="No Silence Definition found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {

			let		columns;

			columns = getSilenceColumns(typeof tableOnRow !== 'function' ? viewSilence : undefined);

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>List of Silences</Title>
				<GyTable columns={columns} dataSource={data.silences} rowKey="silid" onRow={tableOnRow} />
				
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


export function silencesTableTab({filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title, extraComp = null})
{
	if (!modal) {
		const			tabKey = `Silence_${Date.now()}`;

		CreateTab(title ?? "Silences", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<SilencesSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} title={title} /> 
					</>
				);	
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Silences",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<SilencesSearch filter={filter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
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
		span: 12,
	},
};

const tailFormItemLayout = {
	wrapperCol: {
		span: 6,
		offset: 6,
	},
};

function MuteOne({doneCB, modal})
{
	const [form] 				= Form.useForm();
	const [ismmdd, setIsmmdd] 		= useState(false);

	const onFinish = useCallback((values) => {
		// console.log('Received values of form: ', values);

		if (!values) {
			return;
		}	

		if (!values.dayofmonth && !values.dayofweek && !values.months && !values.timerange && !values.dates_mmdd) {
			notification.error({message : 'Invalid Input : Empty Silencing Rule', description : 'Please input at least 1 Filter Criterion for Days, Months or Time Ranges'});
			return;
		}	

		const			obj = {
			tz		: values.tz,	
		};

		if (values.months) {
			obj.months = splitAndTrim(values.months, ',');

			if (obj.months.length === 0) {
				obj.months = undefined;
			}	
		}	

		if (values.dayofweek) {
			obj.dayofweek = splitAndTrim(values.dayofweek, ',');

			if (obj.dayofweek.length === 0) {
				obj.dayofweek = undefined;
			}	
		}	

		if (values.dayofmonth) {
			obj.dayofmonth = splitAndTrim(values.dayofmonth, ',');

			if (obj.dayofmonth.length === 0) {
				obj.dayofmonth = undefined;
			}	
		}	

		if (values.dates_mmdd) {
			obj.dates_mmdd = splitAndTrim(values.dates_mmdd, ',');

			if (obj.dates_mmdd.length === 0) {
				obj.dates_mmdd = undefined;
			}	
		}	

		if (values.timerange) {
			obj.timerange = splitAndTrim(values.timerange, ',');

			if (obj.timerange.length === 0) {
				obj.timerange = undefined;
			}	
		}	

		if (typeof doneCB === 'function') {
			doneCB(obj);
		}	

		if (modal) {
			modal.destroy();
		}	

	}, [doneCB, modal]);

	const onmmdd = useCallback((val) => setIsmmdd(val), []);

	let			comp;

	if (!ismmdd) {
		comp = (
			<>
			<Form.Item name="months" label="Months to apply rule" 
				rules={[ { message: 'Please input valid Months e.g. Jan, Feb to Apr', pattern : /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/ }, ]} >

				<Input placeholder="Enter comma separated list of months e.g. Feb, Mar, Jun to Sep. Default is all months" />
			</Form.Item>	
			
			<Form.Item name="dayofweek" label="Week days to apply rule" 
				rules={[ { message: 'Please input valid Days e.g. Mon, Thu to Sun', pattern : /Mon|Tue|Wed|Thu|Fri|Sat|Sun/ }, ]} >

				<Input placeholder="Enter comma separated list of days e.g. Mon, Tue. Default is all days" />
			</Form.Item>	
				
			<Form.Item name="dayofmonth" label="Days of Month to apply rule" 
				rules={[ { message: 'Please input valid Days of Month e.g. 11 to 15, 18', pattern : /[0-3]*[0-9]/ }, ]} >

				<Input placeholder="Enter comma separated list of days e.g. 11, 13 to 20, Default is all days" />
			</Form.Item>	
			</>
		);
	}	
	else {
		comp = (
			<Form.Item name="dates_mmdd" label="Dates or Date Ranges in MM-DD or MM/DD to apply rule" 
				rules={[ { message: 'Please input valid dates in MM/DD or MM-DD e.g. 02/14 to 02/19, 02/21', pattern : /[0-1][0-9][-/][0-3][0-9]/ }, ]} >
				<Input placeholder="Enter comma separated list of dates e.g. 02/14 to 02/19, 02/21" />
			</Form.Item>	
		);
	}	

	return (
		<>
		<ErrorBoundary>

		<Form {...formItemLayout} form={form} name="mute" onFinish={onFinish} scrollToFirstError >

			<Form.Item name="ismmdd" label="Apply Alert Silencing Rule to Specific Dates Only" valuePropName="checked" initialValue={false} >
				<Switch onChange={onmmdd} />
			</Form.Item>

			{comp}

			<Form.Item name="timerange" label="Time Ranges during a day to apply rule" 
				rules={[ { message: 'Please input valid time ranges in HH:MM fomat e.g.  00:00 to 07:00, 18:00 to 23:59', pattern : /[0-2][0-9]:[0-5][0-9]/ }, ]} >
				<Input placeholder="Enter comma separated time ranges in HH:MM e.g. 00:00 to 07:00, 18:00 to 23:59 : Default is all day" />
			</Form.Item>	
		
			<Form.Item name="tz" label="Time Zone for Date/Times specified" initialValue="UTC" >
				<Select showSearch style={{ width: 100 }} >
					{tzOffsetsArray.map(item => (
						<Select.Option key={item} value={item}>
							{item}
						</Select.Option>
					))}
				</Select>
			</Form.Item>	

			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button type="primary" htmlType="submit" >Add Rule</Button>
				</Space>
				</>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);
}

export function SilenceRules({doneCB, titlestr, modal})
{
	const [form] 				= Form.useForm();
	const [muteArr, setMuteArr]		= useState([]);
	const [muteStr, setMuteStr]		= useState('');

	const onFinish = useCallback((values) => {
		// console.log('Received values of form: ', values);
		
		if (!values || !muteStr || !muteStr.length) {
			notification.error({message : "Mute Format Error", description : "Invalid Mute String format : Must be a JSON Array"});
			return;
		}	

		let			newarr;

		try {
			newarr = JSON.parse(muteStr);

			if (safetypeof(newarr) !== 'array') {
				notification.error({message : "Mute Format Error", description : "Invalid Mute String format : Must be a JSON Array"});
				return;
			}	

			if (newarr.length === 0) {
				notification.error({message : "Mute Format Error", description : "Empty Mute String Array seen"});
				return;
			}	
		}
		catch(e) {
			notification.error({message : "Mute JSON Format Error", description : "Invalid Mute format : Must be a valid JSON Array"});
			return;
		}	

		if (typeof doneCB === 'function') {
			doneCB(newarr);
		}	

		if (modal) {
			modal.destroy();
		}	
	}, [doneCB, muteStr, modal]);

	const muteCB = useCallback((obj) => {
		const newarr = [...muteArr, obj];
		setMuteArr(newarr);
		setMuteStr(JSON.stringify(newarr, null, 4));
	}, [muteArr]);

	const onMuteStrChange = useCallback(({ target: { value } }) => {
		if (!value || value.length < 2) {
			setMuteArr([]);
			setMuteStr('[]');
		}	
		else {
			setMuteStr(value);
		}
	}, []);

	const muteAddCB = useCallback(() => {
		const tmodal = Modal.info();

		tmodal.update({

			title : <Title level={4}><em>Add Silence Rule</em></Title>,
			content : (
				<>
				<ErrorBoundary>
				<MuteOne doneCB={muteCB} modal={tmodal} />
				</ErrorBoundary>						
				</>
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Cancel', 
		});
	}, [muteCB]);	


	return (
		<>
		<ErrorBoundary>

		{titlestr && <Title level={4} style={{ textAlign : 'center', marginBottom : 30, }} ><em>{titlestr}</em></Title>}
		
		<Form {...formItemLayout} form={form} name="mute" onFinish={onFinish} >

			<Form.Item label="Silence Time Rules" >
				<>
				<Space>
				<Button onClick={muteAddCB} >{muteArr.length === 0 ? "Set Silence Date Times" : "Add Additional Date Time Rules"}</Button>
				{muteArr.length > 0 && <Button onClick={() => { setMuteStr('[]'); setMuteArr([]);}} >Reset Date Time Rules</Button>}
				</Space>
				</>
			</Form.Item>

			{muteArr.length > 0 && (
			<Form.Item label="Current Editable Silence Rules" >
				<TextArea value={muteStr} onChange={onMuteStrChange} autoSize={{ minRows: 2, maxRows: 12 }} />
			</Form.Item>
			)}

			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button type="primary" htmlType="submit" disabled={muteArr.length === 0}>Submit</Button>
				</Space>
				</>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);

}	

export function SilenceConfig({doneCB, titlestr})
{
	const [form] 				= Form.useForm();
	const [muteArr, setMuteArr]		= useState([]);
	const [muteStr, setMuteStr]		= useState('');
	const [ismatch, setIsmatch] 		= useState(false);
	const [match, setMatch]			= useState();
	const [endsAt, setEndsAt] 		= useState();
	const matchRef 				= useRef(null);

	const onFinish = useCallback(async (values) => {
		// console.log('Received values of form: ', values);
		
		if (!values || !muteStr || !muteStr.length) {
			notification.error({message : "Mute Format Error", description : "Invalid Mute String format : Must be a JSON Array"});
			return;
		}	

		let			newarr;

		try {
			newarr = JSON.parse(muteStr);

			if (safetypeof(newarr) !== 'array') {
				notification.error({message : "Mute Format Error", description : "Invalid Mute String format : Must be a JSON Array"});
				return;
			}	

			if (newarr.length === 0) {
				notification.error({message : "Mute Format Error", description : "Empty Mute String Array seen"});
				return;
			}	
		}
		catch(e) {
			notification.error({message : "Mute JSON Format Error", description : "Invalid Mute format : Must be a valid JSON Array"});
			return;
		}	

		const obj = {
			name 		: values.name,
			match		: ismatch && match.length > 0 ? match : undefined,
			mutetimes	: newarr,
			endsat		: endsAt ? endsAt : undefined,
		};	

		// Now send the silence to the server

		const conf = {
			url 	: NodeApis.silences + '/add',
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
						title : 'Silence add Failed' + (apidata[0].error === 409 ? ' due to conflict with existing Silence Name' : ''),
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : 'Silence Add Failed',
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : 'Silence Add Success',
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
				title 	: 'Silence Add Failed',
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Silence Add response : ${e}\n${e.stack}\n`);
		}	
	}, [doneCB, ismatch, match, muteStr, endsAt]);
	
	const onismatch = useCallback((val) => {
		setIsmatch(val);

		if (val) {
			setTimeout(() => {
				if (matchRef.current) matchRef.current.setClick();
			}, 100);
		}	
	}, [matchRef]);

	const onMatchCB = useCallback((filter) => {
		setMatch(filter);
	}, []);

	const muteCB = useCallback((obj) => {
		const newarr = [...muteArr, obj];
		setMuteArr(newarr);
		setMuteStr(JSON.stringify(newarr, null, 4));
	}, [muteArr]);

	const onMuteStrChange = useCallback(({ target: { value } }) => {
		if (!value || value.length < 2) {
			setMuteArr([]);
			setMuteStr('[]');
		}	
		else {
			setMuteStr(value);
		}
	}, []);

	const muteAddCB = useCallback(() => {
		const modal = Modal.info();

		modal.update({

			title : <Title level={4}><em>Add Silence Rule</em></Title>,
			content : (
				<>
				<ErrorBoundary>
				<MuteOne doneCB={muteCB} modal={modal} />
				</ErrorBoundary>						
				</>
				),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : false,
			okText : 'Cancel', 
		});
	}, [muteCB]);	

	const onendsatCB = useCallback((date, dateString) => {
		if (!date || !dateString) {
			setEndsAt(undefined);
		}

		setEndsAt(dateString);
	}, []);


	return (
		<>
		<ErrorBoundary>

		{titlestr && <Title level={4} style={{ textAlign : 'center', marginBottom : 30, }} ><em>{titlestr}</em></Title>}
		
		<Form {...formItemLayout} form={form} name="silence" onFinish={onFinish} >

			<Form.Item name="name" label="Silence Name" 
					rules={[ { required : true, message: 'Please input the Silence Name!', whitespace: true, max : 256 }, ]} >
				<Input autoComplete="off" />
			</Form.Item>

			<Form.Item label="Add Silence Match Filters" initialValue={false} >
				<Tooltip color="blue" title="Set filters based on Alert Fields to activate this Silence" >
				<Switch onChange={onismatch} />
				</Tooltip>
			</Form.Item>

			{ismatch && (
			<Form.Item label="Optional Silence Match Filters" >
				{!match && <SubsysMultiFilters ref={matchRef} subsysFields={alertsfields} useHostFields={true} 
								filterCB={onMatchCB} title="Silence Match Filters" linktext="Add Match Filters" />}
				{match && <Button onClick={() => setMatch()} >Reset Match Filter : {strTruncateTo(match, 128)}</Button>}
			</Form.Item>
			)}

			<Form.Item label="Mandatory Silence Time Rules" >
				<>
				<Space>
				<Button onClick={muteAddCB} >{muteArr.length === 0 ? "Set Silence Date Times" : "Add Additional Date Time Rules"}</Button>
				{muteArr.length > 0 && <Button onClick={() => { setMuteStr('[]'); setMuteArr([]);}} >Reset Date Time Rules</Button>}
				</Space>
				</>
			</Form.Item>

			{muteArr.length > 0 && (
			<Form.Item label="Current Editable Silence Rules" >
				<TextArea value={muteStr} onChange={onMuteStrChange} autoSize={{ minRows: 2, maxRows: 12 }} />
			</Form.Item>
			)}

			<Form.Item label="Set Optional Silence Deletion Time" >
				<>
				<Space>
				<DateTimeZonePicker onChange={onendsatCB} cbonreset={true} disabledDate={disablePastTimes} placeholder="Deletion Time" />
				{endsAt && <span>The Silence Definition will be deleted at {endsAt}</span>}
				</Space>
				</>
			</Form.Item>

			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button type="primary" htmlType="submit" disabled={muteArr.length === 0}>Submit</Button>
				</Space>
				</>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);

}

export function SilenceDashboard({filter})
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
		console.log(`Silence Dashboard initial Effect called...`);

		return () => {
			console.log(`Silence Dashboard destructor called...`);
		};	
	}, []);


	const deleteDisableCB = useCallback(async (record, oper) => {
		
		if (!record || !record.silid) {
			return;
		}

		let			conf;

		if (oper === 'delete') {
			conf = {
				url 	: NodeApis.silences + `/${record.silid}`,
				method	: 'delete',
				validateStatus : function (status) {
					return (status < 300) || (status === 400) || (status === 410); 
				},
			};
		}	
		else {
			conf = {
				url 	: NodeApis.silences + '/update',
				method	: 'post',
				data	: {
					silid		:	record.silid,
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
						title : `Silence ${oper} Failed`,
						content : apidata[0].errmsg,
					});

					return;
				}	
				else if (res.status >= 300) {
					Modal.error({
						title : `Silence ${oper} Failed`,
						content : `Server Returned : ${JSON.stringify(apidata)}`,
					});

					return;
				}	

				else {
					Modal.success({
						title : `Silence ${oper} Successful`,
						content : apidata[0].msg,
					});

					const			pdata = objref.current.prevdata;

					if (safetypeof(pdata) === 'array' && pdata.length > 0 && safetypeof(pdata[0].silences) === 'array') { 
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
				title : `Silence ${oper} Failed`,
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});
			console.log(`Exception caught while waiting for Silence ${oper} response : ${e}\n${e.stack}\n`);
		}	


	}, [objref]);	

	const onAddCB = useCallback(() => {
		const modal = Modal.info();

		modal.update({	
			title : <Title level={4}><em>New Alert Silence</em></Title>,
			content : <SilenceConfig doneCB={() => setTimeout(() => {modal.destroy(); objref.current.nextfetchtime = Date.now();}, 1000)} />,
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
			url 	: NodeApis.silences,
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

				console.log(`Fetching Silence List for config ${JSON.stringify(conf)}`);

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
			console.log(`Destructor called for Silence interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, getaxiosconf]);	
	

	const optionDiv = () => {
		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<Button onClick={onAddCB}>Add New Silence</Button>

			<Button onClick={() => {objref.current.nextfetchtime = Date.now()}}>Refresh Silence List</Button>

			</div>
			</>
		);
	};


	let			hdrtag = null, bodycont = null, filtertag = null;

	if (filter) {
		filtertag = <Tag color='cyan'>Filters Set</Tag>;
	}	

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && safetypeof(normdata[0]) === 'object' && safetypeof(normdata[0].silences) === 'array')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		const			columns = getSilenceColumns(viewSilence, deleteDisableCB);

		return (
			<>
			{alertdata}

			{optionDiv()}

			<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 30 }} >
			<Title level={4}>List of Alert Silences</Title>
			<GyTable columns={columns} dataSource={normdata[0].silences} rowKey="silid" scroll={{ x: objref.current.isrange ? 1100 : undefined }} />
			</div>

			</>
		);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && safetypeof(data[0].silences) === 'array') { 
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

			console.log(`Silence Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Silence Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

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
		<Title level={4}><em>Alert Silences{ filter ? ' with input filters' : ''}</em></Title>
		{hdrtag} {filtertag}

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);
}

