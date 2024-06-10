
import 		React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import 		{Radio, Switch, Select, Modal, Input, Button, Typography, Space, Tooltip, InputNumber, Popover, notification, Form, Alert} from 'antd';
import 		moment from 'moment';
import 		{format} from "d3-format";

import		{splitInArrayChecked, safetypeof, strTruncateTo, capitalFirstLetter} from './components/util.js';
import 		{DateTimeZonePicker, RangeTimeZonePicker, PresetTimesOrRanges} from './components/dateTimeZone.js';

import		{svcstatefields, aggrsvcstatefields, svcTableTab, svcInfoTab, svcSummTab, extsvcfields, svcinfofields, svcsummfields, 
		SvcStateMultiQuickFilter, SvcStateAggrFilter, SvcinfoFilter, SvcSummFilter} from './svcDashboard.js';
import		{procstatefields, aggrprocstatefields, procTableTab, procInfoTab, extprocfields, procinfofields, 
		ProcStateMultiQuickFilter, ProcStateAggrFilter, ProcinfoFilter} from './procDashboard.js';
import		{activeconnfields, extactiveconnfields, clientconnfields, extclientconnfields, ActiveConnFilter, ClientConnFilter,
		activeConnTab, clientConnTab} from './netDashboard.js';
import		{clusterstatefields, aggrclusterstatefields, ClusterStateMultiQuickFilter, ClusterStateAggrFilter, clusterTableTab} from './clusterDashboard.js';
import		{hoststatefields, aggrhoststatefields, HostStateMultiQuickFilter, HostStateAggrFilter, hostTableTab,
		hostinfofields, HostInfoFilters, hostinfoTableTab} from './hostViewPage.js';
import		{cpumemfields, aggrcpumemfields, CpuMemMultiQuickFilter, CpuMemAggrFilter, cpumemTableTab} from './cpuMemPage.js';
import		{svcmeshclustfields, SvcMeshFilter, svcMeshTab, svcipclustfields, SvcVirtIPFilter, svcVirtIPTab} from './svcClusterGroups.js';
import		{tracereqfields, exttracefields, aggrtracereqfields, tracestatusfields, aggrtracestatusfields, tracedeffields, tracereqTableTab, tracestatusTableTab, 
		tracedefTableTab, TracereqMultiQuickFilter, TracereqAggrMultiFilter, TracestatusMultiFilter, TracestatusAggrFilter, 
		TracedefMultiFilter} from './traceDashboard.js';

import		{alertsfields, aggralertsfields, AlertMultiQuickFilter, AlertAggrFilter, alertsTableTab} from './alertDashboard.js';
import		{alertdeffields, AlertdefMultiQuickFilter, alertdefTableTab} from './alertDefs.js';
import		{actionfields, ActionMultiQuickFilter, actionsTableTab} from './alertActions.js';
import		{silencefields, SilenceMultiQuickFilter, silencesTableTab} from './alertSilences.js';
import		{inhibitfields, InhibitMultiQuickFilter, inhibitsTableTab} from './alertInhibits.js';

const 		{Search, TextArea} = Input;
const 		{Title} = Typography;
const 		{ErrorBoundary} = Alert;

const compareopers = {
	string : 	[
		{ oper : '=', 		desc : '=', },
		{ oper : '!=', 		desc : '!=', },
		{ oper : '~', 		desc : 'Regex like', },
		{ oper : '!~', 		desc : 'Regex notlike', },
		{ oper : 'substr',	desc : 'Contains string (case sensitive)', },
		{ oper : 'notsubstr', 	desc : 'Does not contain string', },
		{ oper : 'in', 		desc : 'Any of', },
		{ oper : 'notin', 	desc : 'Not Any of', },
	],
	number : 	[
		{ oper : '=', 		desc : '=', },
		{ oper : '!=', 		desc : '!=', },
		{ oper : '<',		desc : '<', },
		{ oper : '<=', 		desc : '<=', },
		{ oper : '>', 		desc : '>', },
		{ oper : '>=', 		desc : '>=', },
		{ oper : 'in', 		desc : 'Any of', },
		{ oper : 'notin', 	desc : 'Not Any of', },
	],
	boolean : 	[
		{ oper : '=', 		desc : '=', },
		{ oper : '!=', 		desc : '!=', },
	],
	enum : [
		{ oper : 'in', 		desc : 'Any of', },
		{ oper : 'notin', 	desc : 'Not Any of', },
	],
	timestamptz : 	[
		{ oper : '=', 		desc : '=', },
		{ oper : '!=', 		desc : '!=', },
		{ oper : '<',		desc : '<', },
		{ oper : '<=', 		desc : '<=', },
		{ oper : '>', 		desc : '>', },
		{ oper : '>=', 		desc : '>=', },
	],
	
};

const fieldexprvalids = {
	'=' 	: 	true,
	'!=' 	: 	true,
	'<' 	:	true,
	'<=' 	:	true,
	'>' 	:	true,
	'>=' 	:	true,
};

const fieldToTableType = {
	string		:	'string',
	number		:	'number',
	boolean		:	'boolean',
	enum		:	'string',
	timestamptz	:	'string',
};	

export const aggregateOpers = [
	{
		oper 	:	'avg', 
		label	:	'Average',
		desc	:	'Average (Mean) of a numeric field or expression e.g. avg(iodelus) or as expression avg(kbin15s + kbout15s)',
		types	:	['number'],
		outtype	:	'number',
		regex	:	null,
		reqout	:	true,	
	},
	{
		oper	:	'sum',
		label	:	'Sum',
		desc	:	'Sum of a numeric field or expression (e.g. sum(kbin15s + kbout15s))',
		types	:	['number'],
		outtype	:	'number',
		regex	:	null,
		reqout	:	true,	
	},
	{
		oper	:	'max',
		label	:	'Max',
		desc	:	'Max of a numeric field or expression e.g. max(cpu_pct)',
		types	:	['number', 'timestamptz'],
		outtype	:	'field',
		regex	:	null,
		reqout	:	true,	
	},

	{
		oper	:	'min',
		label	:	'Min',
		desc	:	'Min of a numeric field or expression e.g. min(cpu_pct)',
		types	:	['number', 'timestamptz'],
		outtype	:	'field',
		regex	:	null,
		reqout	:	true,	
	},
	{
		oper	:	'percentile',
		label	:	'Percentile',
		desc	:	'Percentile of a numeric field or expression e.g. percentile(0.95, resp5s) where 0.95 implies p95 or as expression percentile(0.99, kbin15s + kbout15s)',
		types	:	['number'],
		outtype	:	'number',
		regex	:	/percentile\([ \t]0\.\d{1,6}[ \t],/,
		reqout	:	true,	
	},
	{
		oper	:	'count',
		label	:	'Count of condition',
		desc	:	'Count of a boolean expression : e.g. count(sererr + clierr > 0) for expression count. Specify count(*) for total number of records',
		types	:	['number', 'string', 'timestamptz', 'boolean', 'enum'],
		outtype	:	'number',
		regex	:	null,
		reqout	:	true,	
	},
	{
		oper	:	'first_elem',
		label	:	'First Value',
		desc	:	'First encountered value of a field or expression as in : e.g. first_elem(port)',
		types	:	['number', 'string', 'timestamptz', 'boolean', 'enum'],
		outtype	:	'field',
		regex	:	null,
		reqout	:	true,	
	},
	{
		oper	:	'last_elem',
		label	:	'Last Value',
		desc	:	'Last encountered value of a field or expression as in : e.g. last_elem(svcip1)',
		types	:	['number', 'string', 'timestamptz', 'boolean', 'enum'],
		outtype	:	'field',
		regex	:	null,
		reqout	:	true,	
	},
	{
		oper	:	'bool_or',
		label	:	'Any One True',
		desc	:	'bool_or(logical expr) will return true if at least one value of expr is true as in bool_or(hicap = true) or bool_or(kbin15s + kbout15s > 0)',
		types	:	['number', 'string', 'timestamptz', 'boolean', 'enum'],
		outtype	:	'boolean',
		regex	:	/.*[=,~,>,<]+.*/,
		reqout	:	true,	
	},
	{
		oper	:	'bool_and',
		label	:	'All True',
		desc	:	'bool_and(logical expr) will return true only if all values of expr are true as in bool_and(hicap = true) or bool_and(kbin15s + kbout15s > 100)',
		types	:	['number', 'string', 'timestamptz', 'boolean', 'enum'],
		outtype	:	'boolean',
		regex	:	/.*[=,~,>,<]+.*/,
		reqout	:	true,	
	},
];

export function getAggrOutType(expr, colarr)
{
	if (!expr || !colarr) {
		return null;
	}	

	for (let field of colarr) {
		if (expr.includes(field.field)) {
			return field.type;
		}	
	}	

	return null;
}	


function validNonNullStr(str, field)
{
	if (typeof str === 'string' && str.length > 0) {
		return true;
	}	

	return `Invalid String input for field ${field} : Empty strings not allowed...`; 
}	

export function createEnumArray(inputarr)
{
	let			enumarr = [];

	if (Array.isArray(inputarr)) {
		for (let i = 0; i < inputarr.length; ++i) {
			enumarr.push({ name : inputarr[i], value : inputarr[i] });
		}	
	}	

	return enumarr;
}	

export const hostfields = [
	{ field : 'host',		desc : 'Hostname',		type : 'string',	subsys : 'host',	valid : validNonNullStr, },
	{ field : 'cluster',		desc : 'Cluster Name',		type : 'string',	subsys : 'host',	valid : null, },
	{ field : 'parid',		desc : 'Host Partha ID',	type : 'string',	subsys : 'host',	valid : null, },
];	


export function isFieldPresent(fieldarr, field) 
{
	if (fieldarr && field) {
		for (let col of fieldarr) {
			if (col.field === field) {
				return true;
			}	
		}	
	}	
	
	return false;
}	

// Will skip columns without key or if key !== dataIndex
export function getFieldsFromTableColumns(colarr, subsys, extraarr = [])
{
	const			fields = [];

	if (!Array.isArray(colarr)) {
		return fields;
	}

	for (let col in colarr) {
		if (col.key === col.dataIndex && col.dataIndex && col.gytype) {
			fields.push({ field : col.key, desc : col.title, type : col.gytype, subsys, valid : null });
		}
	}	

	for (let extra in extraarr) {
		fields.push(extra);
	}	

	return fields;
}	

export const subsysCategories = [
	{ name : 'Service',		value : 'service' },
	{ name : 'Process',		value : 'process' },
	{ name : 'Network',		value : 'network' },
	{ name : 'Tracing',		value : 'trace' },
	{ name : 'Cluster',		value : 'cluster' },
	{ name : 'Hosts',		value : 'hosts' },
	{ name : 'Alerts',		value : 'alerts' },
];

export const getSubsysFromCategory = (category) => {

	switch (category) {

	case 'service'	:	
	return [ 
		{ name : 'Service State Extended ', 		value : 'extsvcstate',		skipalert : false, },
		{ name : 'Service State Basic', 		value : 'svcstate',		skipalert : false, },
		{ name : 'Inbound Network Stats Extended',	value : 'extactiveconn',	skipalert : false, },
		{ name : 'Trace Requests Extended',		value : 'exttracereq',		skipalert : true, },
		{ name : 'Interconnected Service Groups',	value : 'svcmeshclust',		skipalert : true, },
		{ name : 'Virtual IP Service Groups',		value : 'svcipclust',		skipalert : true, },
		{ name : 'Service Summary', 			value : 'svcsumm',		skipalert : false, },
		{ name : 'Service Info', 			value : 'svcinfo',		skipalert : false, },
	];

	case 'process'	:	
	return [ 
		{ name : 'Process States Extended', 		value : 'extprocstate',		skipalert : false, },
		{ name : 'Process States Basic', 		value : 'procstate',		skipalert : false, },
		{ name : 'Process Info', 			value : 'procinfo',		skipalert : false, },
		/*
		{ name : 'Host Top CPU Processes', 		value : 'topcpu',		skipalert : false, },
		{ name : 'Host Top CPU Process Groups', 	value : 'toppgcpu',		skipalert : false, },
		{ name : 'Host Top Memory Resident Processes', 	value : 'toprss',		skipalert : false, },
		{ name : 'Host Top New Process Parents', 	value : 'topfork',		skipalert : false, },
		*/
	];	

	case 'network'	:	
	return [ 
		{ name : 'Service Inbound Network Extended ',	value : 'extactiveconn',	skipalert : false, },
		{ name : 'Service Inbound Network Basic', 	value : 'activeconn',		skipalert : false, },
		{ name : 'Client Outbound Network Extended ',	value : 'extclientconn',	skipalert : false, },
		{ name : 'Client Outbound Network Basic', 	value : 'clientconn',		skipalert : false, },
	];

	case 'trace'	:	
	return [ 
		{ name : 'Trace Requests Extended',		value : 'exttracereq',		skipalert : true, },
		{ name : 'Trace Requests Basic', 		value : 'tracereq',		skipalert : true, },
		{ name : 'Trace Status',			value : 'tracestatus',		skipalert : true, },
		{ name : 'Trace Definitions', 			value : 'tracedef',		skipalert : true, },
	];

	case 'cluster'	:	
	return [ 
		{ name : 'Cluster State', 			value : 'clusterstate',		skipalert : false, },
	];


	case 'hosts'	:	
	return [
		{ name : 'Host State', 				value : 'hoststate',		skipalert : false, },
		{ name : 'Host CPU Memory', 			value : 'cpumem',		skipalert : false, },
		{ name : 'Host Info', 				value : 'hostinfo',		skipalert : true, },
	];

	case 'alerts'	:	
	return [
		{ name : 'Alerts', 				value : 'alerts',		skipalert : true, },
		{ name : 'Alert Definitions', 			value : 'alertdef',		skipalert : true, },
		{ name : 'Alert Actions', 			value : 'actions',		skipalert : true, },
		{ name : 'Alert Silences', 			value : 'silences',		skipalert : true, },
		{ name : 'Alert Inhibits', 			value : 'inhibits',		skipalert : true, },
	];

	default		:	return [];

	}
};

export function getAlertSubsysCategories()
{
	return subsysCategories.filter((item) => item.value !== 'alerts' && item.value !== 'trace');
}

export function getAlertSubsysFromCategory(category)
{
	return getSubsysFromCategory(category).filter((obj) => obj.skipalert !== true);
}

export function getInrecsField(subsys)
{
	return { field : 'inrecs',	desc : '# Records in Aggregation',	type : 'number',	subsys : subsys,	valid : null, };
}	

export function getSubsysHandlers(subsys, useHostFields = true)
{
	switch (subsys) {

	case 'svcstate' :
		return {
			fields 		: !useHostFields ? svcstatefields : [...hostfields, ...svcstatefields],
			aggrfields	: !useHostFields ? aggrsvcstatefields : [...hostfields, ...aggrsvcstatefields],
			filtercb	: (params) => SvcStateMultiQuickFilter({useHostFields, ...params}),
			aggrfiltercb	: SvcStateAggrFilter,
			tablecb		: svcTableTab,
			isnotime	: false,
		};	

	case 'extsvcstate' :
		return {
			fields 		: !useHostFields ? [...svcstatefields, ...extsvcfields] : [...hostfields, ...svcstatefields, ...extsvcfields],
			aggrfields	: !useHostFields ? [...aggrsvcstatefields, ...extsvcfields] : [...hostfields, ...aggrsvcstatefields, ...extsvcfields],
			filtercb	: (params) => SvcStateMultiQuickFilter({useHostFields, ...params, isext : true, }),
			aggrfiltercb	: (params) => SvcStateAggrFilter({useHostFields, ...params, isext : true, }),
			tablecb		: (params) => svcTableTab({...params, isext : true}),
			isnotime	: false,
		};	

	case 'svcinfo' : 
		return {
			fields 		: !useHostFields ? svcinfofields : [...hostfields, ...svcinfofields],
			aggrfields	: !useHostFields ? [...svcinfofields, getInrecsField('svcinfo')] : [...hostfields, ...svcinfofields, getInrecsField('svcinfo')],
			filtercb	: (params) => SvcinfoFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => SvcinfoFilter({useHostFields, ...params}),
			tablecb		: svcInfoTab,
			isnotime	: false,
		};	


	case 'svcsumm' : 
		return {
			fields 		: !useHostFields ? svcsummfields : [...hostfields, ...svcsummfields],
			aggrfields	: !useHostFields ? [...svcsummfields, getInrecsField('svcsumm')] : [...hostfields, ...svcsummfields, getInrecsField('svcsumm')],
			filtercb	: (params) => SvcSummFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => SvcSummFilter({useHostFields, ...params}),
			tablecb		: svcSummTab,
			isnotime	: false,
		};	

	case 'svcmeshclust' : 
		return {
			fields 		: svcmeshclustfields,
			aggrfields	: undefined,
			filtercb	: SvcMeshFilter,
			aggrfiltercb	: undefined,
			tablecb		: svcMeshTab,
			isnotime	: false,
		};	

	case 'svcipclust' : 
		return {
			fields 		: svcipclustfields,
			aggrfields	: undefined,
			filtercb	: SvcVirtIPFilter,
			aggrfiltercb	: undefined,
			tablecb		: svcVirtIPTab,
			isnotime	: false,
		};	



	case 'activeconn' :
		return {
			fields 		: !useHostFields ? activeconnfields : [...hostfields, ...activeconnfields],
			aggrfields	: !useHostFields ? [...activeconnfields, getInrecsField('activeconn')] : [...hostfields, ...activeconnfields, getInrecsField('activeconn')],
			filtercb	: (params) => ActiveConnFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => ActiveConnFilter({useHostFields, ...params}),
			tablecb		: activeConnTab,
			isnotime	: false,
		};	


	case 'extactiveconn' :
		return {
			fields 		: !useHostFields ? [...activeconnfields, ...extactiveconnfields] : [...hostfields, ...activeconnfields, ...extactiveconnfields],
			aggrfields	: !useHostFields ? [...activeconnfields, ...extactiveconnfields, getInrecsField('extactiveconn')] : 
								[...hostfields, ...activeconnfields, ...extactiveconnfields, getInrecsField('extactiveconn')],
			filtercb	: (params) => ActiveConnFilter({useHostFields, ...params, isext : true, }),
			aggrfiltercb	: (params) => ActiveConnFilter({useHostFields, ...params, isext : true, }),
			tablecb		: (params) => activeConnTab({...params, isext : true}),
			isnotime	: false,
		};	

	case 'clientconn' :
		return {
			fields 		: !useHostFields ? clientconnfields : [...hostfields, ...clientconnfields],
			aggrfields	: !useHostFields ? [...clientconnfields, getInrecsField('clientconn')] : [...hostfields, ...clientconnfields, getInrecsField('clientconn')],
			filtercb	: (params) => ClientConnFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => ClientConnFilter({useHostFields, ...params}),
			tablecb		: clientConnTab,
			isnotime	: false,
		};	


	case 'extclientconn' :
		return {
			fields 		: !useHostFields ? [...clientconnfields, ...extclientconnfields] : [...hostfields, ...clientconnfields, ...extclientconnfields],
			aggrfields	: !useHostFields ? [...clientconnfields, ...extclientconnfields, getInrecsField('extclientconn')] : 
								[...hostfields, ...clientconnfields, ...extclientconnfields, getInrecsField('extclientconn')],
			filtercb	: (params) => ClientConnFilter({useHostFields, ...params, isext : true, }),
			aggrfiltercb	: (params) => ClientConnFilter({useHostFields, ...params, isext : true, }),
			tablecb		: (params) => clientConnTab({...params, isext : true}),
			isnotime	: false,
		};	

	case 'exttracereq' :
		return {
			fields 		: !useHostFields ? [...tracereqfields, ...exttracefields] : [...hostfields, ...tracereqfields, ...exttracefields],
			aggrfields	: !useHostFields ? aggrtracereqfields : [...hostfields, ...aggrtracereqfields],
			filtercb	: (params) => TracereqMultiQuickFilter({useHostFields, ...params, isext : true, }),
			aggrfiltercb	: (params) => TracereqAggrMultiFilter({useHostFields, ...params, isext : true, }),
			tablecb		: (params) => tracereqTableTab({...params, isext : true}),
			isnotime	: false,
		};	

	case 'tracereq' :
		return {
			fields 		: !useHostFields ? tracereqfields : [...hostfields, ...tracereqfields],
			aggrfields	: !useHostFields ? aggrtracereqfields : [...hostfields, ...aggrtracereqfields],
			filtercb	: (params) => TracereqMultiQuickFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => TracereqAggrMultiFilter({useHostFields, ...params, }),
			tablecb		: tracereqTableTab,
			isnotime	: false,
		};	

	case 'tracestatus' :
		return {
			fields 		: !useHostFields ? tracestatusfields : [...hostfields, ...tracestatusfields],
			aggrfields	: aggrtracestatusfields,
			filtercb	: (params) => TracestatusMultiFilter({useHostFields, ...params}),
			aggrfiltercb	: TracestatusAggrFilter,
			tablecb		: tracestatusTableTab,
		};	

	case 'tracedef' :
		return {
			fields 		: tracedeffields,
			aggrfields	: undefined,
			filtercb	: TracedefMultiFilter,
			aggrfiltercb	: undefined,
			tablecb		: tracedefTableTab,
			isnotime	: true,
		};	

	case 'procstate' :
		return {
			fields 		: !useHostFields ? procstatefields : [...hostfields, ...procstatefields],
			aggrfields	: !useHostFields ? aggrprocstatefields : [...hostfields, ...aggrprocstatefields],
			filtercb	: (params) => ProcStateMultiQuickFilter({useHostFields, ...params}),
			aggrfiltercb	: ProcStateAggrFilter,
			tablecb		: procTableTab,
			isnotime	: false,
		};	

	case 'extprocstate' :
		return {
			fields 		: !useHostFields ? [...procstatefields, ...extprocfields] : [...hostfields, ...procstatefields, ...extprocfields],
			aggrfields	: !useHostFields ? [...aggrprocstatefields, ...extprocfields] : [...hostfields, ...aggrprocstatefields, ...extprocfields],
			filtercb	: (params) => ProcStateMultiQuickFilter({useHostFields, ...params, isext : true, }),
			aggrfiltercb	: (params) => ProcStateAggrFilter({useHostFields, ...params, isext : true, }),
			tablecb		: (params) => procTableTab({...params, isext : true}),
			isnotime	: false,
		};	

	case 'procinfo' : 
		return {
			fields 		: !useHostFields ? svcinfofields : [...hostfields, ...procinfofields],
			aggrfields	: !useHostFields ? [...procinfofields, getInrecsField('procinfo')] : [...hostfields, ...procinfofields, getInrecsField('procinfo')],
			filtercb	: (params) => ProcinfoFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => ProcinfoFilter({useHostFields, ...params}),
			tablecb		: procInfoTab,
			isnotime	: false,
		};	


	case 'clusterstate' :
		return {
			fields 		: clusterstatefields,
			aggrfields	: aggrclusterstatefields,
			filtercb	: ClusterStateMultiQuickFilter,
			aggrfiltercb	: ClusterStateAggrFilter,
			tablecb		: clusterTableTab,
			isnotime	: false,
		};	

	case 'hoststate' : 
		return {
			fields 		: !useHostFields ? hoststatefields : [...hostfields, ...hoststatefields],
			aggrfields	: !useHostFields ? aggrhoststatefields : [...hostfields, ...aggrhoststatefields],
			filtercb	: (params) => HostStateMultiQuickFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => HostStateAggrFilter({useHostFields, ...params}),
			tablecb		: hostTableTab,
			isnotime	: false,
		};	

	case 'hostinfo' : 
		return {
			fields 		: hostinfofields,
			aggrfields	: hostinfofields,
			filtercb	: HostInfoFilters,
			aggrfiltercb	: HostInfoFilters,
			tablecb		: hostinfoTableTab,
			isnotime	: false,
		};	

	case 'cpumem' : 
		return {
			fields 		: !useHostFields ? cpumemfields : [...hostfields, ...cpumemfields],
			aggrfields	: !useHostFields ? aggrcpumemfields : [...hostfields, ...aggrcpumemfields],
			filtercb	: (params) => CpuMemMultiQuickFilter({useHostFields, ...params}),
			aggrfiltercb	: (params) => CpuMemAggrFilter({useHostFields, ...params}),
			tablecb		: cpumemTableTab,
			isnotime	: false,
		};	

	case 'alerts' : 
		return {
			fields 		: alertsfields,
			aggrfields	: aggralertsfields,
			filtercb	: AlertMultiQuickFilter,
			aggrfiltercb	: AlertAggrFilter,
			tablecb		: alertsTableTab,
			isnotime	: false,
		};	

	case 'alertdef' : 
		return {
			fields 		: alertdeffields,
			aggrfields	: undefined,
			filtercb	: AlertdefMultiQuickFilter,
			aggrfiltercb	: undefined,
			tablecb		: alertdefTableTab,
			isnotime	: true,
		};	

	case 'actions' : 
		return {
			fields 		: actionfields,
			aggrfields	: undefined,
			filtercb	: ActionMultiQuickFilter,
			aggrfiltercb	: undefined,
			tablecb		: actionsTableTab,
			isnotime	: true,
		};	


	case 'silences' : 
		return {
			fields 		: silencefields,
			aggrfields	: undefined,
			filtercb	: SilenceMultiQuickFilter,
			aggrfiltercb	: undefined,
			tablecb		: silencesTableTab,
			isnotime	: true,
		};	

	case 'inhibits' : 
		return {
			fields 		: inhibitfields,
			aggrfields	: undefined,
			filtercb	: InhibitMultiQuickFilter,
			aggrfiltercb	: undefined,
			tablecb		: inhibitsTableTab,
			isnotime	: true,
		};	



	case 'topcpu' :
	case 'toppgcpu' :
	case 'toprss' :
	case 'topfork' :
		return {};	// TODO



	default :
		return {};
	}
}	

const reservedColNames = {
	time	:	0,
	inrecs	:	0,
	rowid	:	0,
};	

export function CustomAggrColumns({subsysFields, aggrsubsysFields, addtime, addinrecs, doneCB, title})
{
	const [form] 				= Form.useForm();
	const [colStr, setColStr]		= useState('');
	const [operType, setOperType]		= useState('custom');
	const [aggrOper, setAggrOper]		= useState('avg');
	const [percentile, setPercentile]	= useState(0.95); 
	const [curcol, setCurcol]		= useState();
	const [curColStr, setCurColStr]		= useState('');
	const objref 				= useRef(null);

	if (objref.current === null) {
		objref.current = {
			colnames	:	{},
		}	
	}

	const onFinish = useCallback(async (values) => {
		// console.log('Received values of form: ', values);
		
		if (!colStr) {
			notification.error({message : "Input Format Error", description : "Empty Column Definition seen"});
			return;
		}	

		let		colstr = colStr.trim().slice(1, -1);

		if (!colstr) {
			notification.error({message : "Input Format Error", description : "Empty Column Definition seen"});
			return;
		}	

		if (colstr.endsWith(',')) {
			colstr = colstr.slice(0, -2);
		}

		let		colarr = colstr.split('","');
		
		if (colarr.length > 24) {
			notification.error({message : "Max Column Limit Error", description : `Please limit the number of columns to 24 : Current count is ${colarr.length}`});
			return;
		}	
		
		// Form the field definition array
		const		fieldarr = [], tablecolarr = [];

		for (const col of colarr) {
			let 		type, colname;

			type = getAggrOutType(col, subsysFields);

			if (!type) {
				type = getAggrOutType(col, aggrsubsysFields);

				if (!type) {
					notification.error({message : "Invalid Column", description : `Column Definition Invalid : ${col} : Definition contains no valid fields`});
					return;
				}	
			}	

			const carr = col.split(' as ');
			
			if (carr.length === 2) {
				colname = carr[1];
			}
			else {
				colname = carr[0];
			}	

			fieldarr.push({ field : colname, desc : colname, type : type, subsys : subsysFields[0].subsys, valid : null, });
			tablecolarr.push(
				{
					title 		:	capitalFirstLetter(colname),
					key 		:	colname,
					dataIndex 	:	colname,
					gytype 		:	fieldToTableType[type],
					render 		:	type === 'number' ? ((num) => format(",")(num)) : undefined,
					width 		:	120,
				},
			);
		}	

		if (addtime) {
			if (!isFieldPresent(fieldarr, 'time')) {
				fieldarr.push({ field : 'time', desc : 'Timestamp', type : 'timestamptz', subsys : subsysFields[0].subsys, valid : null, });
				tablecolarr.push(
					{
						title 		:	'Time',
						key 		:	'time',
						dataIndex 	:	'time',
						gytype 		:	'string',
						width 		:	140,
					},
				);
			}	
		}	
		
		if (addinrecs) {
			if (!isFieldPresent(fieldarr, 'inrecs')) {
				fieldarr.push({ field : 'inrecs', desc : '# Records in Aggregation', type : 'number', subsys : subsysFields[0].subsys, valid : null, });
				tablecolarr.push(
					{
						title 		:	'# Records',
						key 		:	'inrecs',
						dataIndex 	:	'inrecs',
						gytype 		:	'number',
						width 		:	120,
					},
				);
			}	
		}	

		if (typeof doneCB === 'function') {
			doneCB(colarr, fieldarr, tablecolarr);
		}	

	}, [colStr, subsysFields, aggrsubsysFields, addtime, addinrecs, doneCB]);


	const onOperTypeChange = useCallback((e) => {
		setOperType(e.target.value);
	}, []);	


	const setColumn = useCallback((col, ispredefined) => {
		if (!col) {
			notification.error({message : "Input Format Error", description : "Empty Column Definition seen"});
			return;
		}	

		if (ispredefined === true) {
			if (objref.current.colnames[col]) {
				return;
			}

			objref.current.colnames[col] = col;
		}	
		else {
			if (!col.includes(" as ")) {
				notification.error({message : "Input Format Error", description : "Please specify Output Column Name using 'as ColumnName' within Column Definition"});
				return;
			}	
			
			col = col.trim();

			const carr = col.split(' as ');
			
			if (carr.length !== 2) {
				notification.error({message : "Input Format Error", description : "Multiple ' as ' clauses seen within Column Definition..."});
				return;
			}	

			if (objref.current.colnames[carr[1]]) {
				notification.error({message : "Input Format Error", description : `Output Column Name ${carr[1]} already used in column : ${objref.current.colnames[carr[1]]}`});
				return;
			}	

			if (reservedColNames[carr[1]]) {
				notification.error({message : "Input Format Error", description : `Output Column Name ${carr[1]} is a reserved column name. Please specify a different name.`});
				return;
			}	

			objref.current.colnames[carr[1]] = carr[0];
		}

		setColStr((oldstr) => {return oldstr + (oldstr.length > 2 ? "," : '') + JSON.stringify(col);});

		setCurColStr('');

		setCurcol();

	}, [objref]);	
	
	const onPreCol = useCallback((e) => {
		setColumn(e.target.value, true);
	}, [setColumn]);	

	const onAggrOper = useCallback((e) => {
		setAggrOper(e.target.value);
	}, []);	

	const onPercentile = useCallback((val) => {
		setPercentile(val);
	}, []);	
	
	const onCurrColChange = useCallback((e) => {
		setCurcol(e.target.value);
	}, []);	

	const onDefStrChange = useCallback(({ target: { value } }) => {
		setColStr(value);
	}, []);

	
	let			aoper;

	if (aggrOper && aggrOper.length > 0) {
		for (let o of aggregateOpers) {
			if (o.oper === aggrOper) {
				aoper = o;
				break;
			}	
		}	
	}	

	const getSampleString = () => {
		let		init1 = '';

		if (aggrOper === 'percentile') {
			init1 = `${percentile ?? 0.95}, `;
		}	
		else if (aggrOper === 'count') {
			return `e.g. count(sererr + clierr > 0) as UniqueColumnName : Usage : count(${curcol} <Comparator like <, >, =, !=> <Some Value> `;
		}	

		return `${aggrOper}(${init1}${curcol}) as ${aggrOper}_${curcol}`;
	};	

	return (
		<>
		<ErrorBoundary>

		{title && <Title level={4} style={{ textAlign : 'center', marginBottom : 30, }} ><em>{title}</em></Title>}
		
		<Form {...formItemLayout} form={form} name="colarr" onFinish={onFinish} >

			<Form.Item label="Select Aggregated Column Type" >

				<Radio.Group onChange={onOperTypeChange} defaultValue="oper" >
					<Radio.Button value="oper">Using Custom Aggregation Operators</Radio.Button>
					<Radio.Button value="predefined">Using Predefined Aggregated Columns</Radio.Button>
				</Radio.Group>	

			</Form.Item>	

			{operType === 'predefined' && (

				<Form.Item label="Select Predefined Aggregated Fields" >

					<Radio.Group onChange={onPreCol} >
						{aggrsubsysFields.map((item, index) => (
							<Radio.Button key={index} value={item.field}>{item.desc}</Radio.Button>
						))}
					</Radio.Group>	

				</Form.Item>	

			)}

			{operType !== 'predefined' && (
				<>

				<Form.Item label="Select Aggregation Operator" >

					<Radio.Group onChange={onAggrOper}  defaultValue="avg" >
						{aggregateOpers.map((item, index) => (
							<Radio.Button key={index} value={item.oper}>{item.desc}</Radio.Button>
						))}
					</Radio.Group>	

				</Form.Item>	

				{aggrOper === 'percentile' && (
					<Form.Item label="Enter Percentile Number">
						<InputNumber min={0.1} max={0.9999} defaultValue={0.95} onChange={onPercentile} step={0.1} />
					</Form.Item>	
				)}

				{aoper && (
				<>
				<Form.Item label="Select Fields(s) to Aggregate" >

					<Radio.Group onChange={onCurrColChange} value="NoSuchField" >
						{subsysFields.filter((field) => aoper.types.includes(field.type)).map((item, index) => (
							<Radio.Button key={index} value={item.field}>{`${item.desc} (${item.field})`}</Radio.Button>
						))}
					</Radio.Group>	

				</Form.Item>	

				{curcol && 
				<>
				<Form.Item label="Sample Definition based on selections" >
					<span>{getSampleString()} {aggrOper !== 'count'? "Multiple Aggregates can be clubbed as well e.g. avg(kbin15s)/avg(kbout15s + kbout15s) * 100 as ratioin" : ""}</span>
				</Form.Item>	

				<Form.Item label="Aggregated Column Definition" >
					<Search placeholder="Input based on Sample shown above e.g. : avg(kbin15s + kbout15s) as avgnet" onSearch={setColumn} 
						value={curColStr.length > 0 || aggrOper === 'count' ? curColStr : getSampleString()} onChange={(e) => setCurColStr(e.target.value)} enterButton='Add Column' />
				</Form.Item>	

				</>
				}

				</>

				)}

				</>
			)}


			{colStr.length > 0 && (
			<>

			<Form.Item {...tailFormItemLayout} >
				<section style={{ marginTop: 30, marginBottom: 40  }}>
				<span>{operType !== 'predefined' ? "Select an Operator/Field to add other Columns. " : ""} Max 24 columns allowed. A mix of Custom and Predefined Aggregations is supported.</span>
				</section>
			</Form.Item>

			<Form.Item label="Current Editable Column Definitions" >
				<TextArea value={colStr} onChange={onDefStrChange} autoSize={{ minRows: 1, maxRows: 8 }} />
			</Form.Item>

			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button type="primary" htmlType="submit" >Submit Columns</Button>
				</Space>
				</>
			</Form.Item>

			</>
			)}

		</Form>

		</ErrorBoundary>
		</>
	);
}	

export const CustomAggrColModal = React.forwardRef(({subsysFields, aggrsubsysFields, addtime, addinrecs, doneCB, title, linktext = 'Set Custom Aggregated Columns'}, ref) =>
{
	const		objref = useRef(null);

	if (objref.current === null) {
		objref.current = {
			modal		:	null,
		};	
	}

	if (!subsysFields || !aggrsubsysFields) {
		return null;
	}	

	const onDoneCB = useCallback((newcolarr, newfieldarr, newtablecolarr) => {
		if (objref.current.modal) {
			objref.current.modal.destroy();
			objref.current.modal = null;
		}

		if (newcolarr && newfieldarr && newtablecolarr && newcolarr.length > 0 && typeof doneCB === 'function') {
			doneCB(newcolarr, newfieldarr, newtablecolarr);
		}	
		
	}, [objref, doneCB]);

	const aggrcols = useCallback(() => {
		
		objref.current.modal = Modal.info({
			title : <Title level={4}>{title ?? "Custom Aggregated Columns"}</Title>,

			content : <CustomAggrColumns doneCB={onDoneCB} subsysFields={subsysFields} aggrsubsysFields={aggrsubsysFields} 
						addtime={addtime} addinrecs={addinrecs} title={title} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onDoneCB, subsysFields, aggrsubsysFields, addtime, addinrecs, title]);	

	React.useImperativeHandle(ref, () => ({
		setClick : () => {
			aggrcols();
		},
	}), [aggrcols]);

	return <Button onClick={aggrcols} >{linktext}</Button>;
});

export function SortColumn({subsysFields, doneCB})
{
	const [form] 			= Form.useForm();

	const onFinish = useCallback((values) => {
		// console.log('Received values of form: ', values);

		if (!values || !values.sortcolumns || !values.sortdir) {
			notification.error({message : "Input Error", description : "Please select the Sort Column and Direction"});
			return;
		}	

		if (typeof doneCB === 'function') {
			doneCB(values.sortcolumns, values.sortdir);
		}	

	}, [doneCB]);

	if (!subsysFields) {
		return null;
	}

	return (
		<>
		<ErrorBoundary>

		<Form {...formItemLayout} form={form} name="sort" onFinish={onFinish} >

			<Form.Item name="sortcolumns" label="Select the column to sort on" >
				<Radio.Group>
					{subsysFields.map((item, index) => (
						<Radio.Button key={index} value={item.field}> {item.desc} </Radio.Button>
					))}
				</Radio.Group>
			</Form.Item>	

			<Form.Item name="sortdir" label="Sort Direction" initialValue="desc" >
				<Radio.Group>
				<Radio.Button value="asc">Ascending</Radio.Button>
				<Radio.Button value="desc">Descending</Radio.Button>
				</Radio.Group>
			</Form.Item>

			<Form.Item {...tailFormItemLayout}>
				<Button htmlType="submit" >Set Sort Column</Button>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);
}

export const SortColumnModal = React.forwardRef(({subsysFields, doneCB, title, linktext = 'Set Sort Column'}, ref) =>
{
	const		objref = useRef(null);

	if (objref.current === null) {
		objref.current = {
			modal		:	null,
		};	
	}

	if (!subsysFields) {
		return null;
	}	

	const onDoneCB = useCallback((col, dir) => {
		if (objref.current.modal) {
			objref.current.modal.destroy();
			objref.current.modal = null;
		}

		if (col && typeof doneCB === 'function') {
			doneCB(col, dir);
		}	
		
	}, [objref, doneCB]);

	const sortcols = useCallback(() => {
		
		objref.current.modal = Modal.info({
			title : <Title level={4}>{title ?? "Set Sort Column"}</Title>,

			content : <SortColumn doneCB={onDoneCB} subsysFields={subsysFields} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onDoneCB, subsysFields, title]);	

	React.useImperativeHandle(ref, () => ({
		setClick : () => {
			sortcols();
		},
	}), [sortcols]);

	return <Button onClick={sortcols} >{linktext}</Button>;
});


export const SubsysMultiFilters = React.forwardRef(({subsysFields, useHostFields, filterCB, title, linktext = 'Subsystem Filters'}, ref) => 
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
			title : <Title level={4}>{title ?? "Subsystem Filters"}</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={!useHostFields ? subsysFields : [...hostfields, ...subsysFields]} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields, subsysFields, title]);	

	React.useImperativeHandle(ref, () => ({
		setClick : () => {
			multifilters();
		},
	}), [multifilters]);

	return <Button onClick={multifilters} >{linktext}</Button>;
});	

export function HostMultiFilters({filterCB})
{
	return <SubsysMultiFilters subsysFields={hostfields} filterCB={filterCB} title="Host Filters" linktext="Host Filters" />;
}	


export function MultiFilters({filterCB, filterfields, useHostFields})
{
	const			[fieldArr, ] = useState(useHostFields === true ? [...hostfields, ...filterfields] : filterfields);
	const			[fieldIdx, setFieldIdx] = useState(-1);
	const			[compArr, setCompArr] = useState();
	const			[compIdx, setCompIdx] = useState(-1);
	const			[isFieldExpr, setFieldExpr] = useState(false);
	const			[criterion, setCriterion] = useState('');
	const			[filterStr, setFilterStr] = useState('');
	const			[,setAndOr] = useState();
	const			objref = useRef(null);

	if (objref.current === null) {
		objref.current	= {
			andOr 		: 'and',
			nfilters 	: 0,
			enumCrit	: '',
		}	
	}	

	const fieldOpts = useMemo(() => {
		const		rarr = [];

		for (let i = 0; i < fieldArr.length; ++i) {
			rarr.push({ label : fieldArr[i].desc, value : i });
		}	

		return rarr;
	}, [fieldArr]);	
	
	const onFieldChange = useCallback((e) => {
		const		i = Number(e.target.value);

		if (Number.isNaN(i) || i < 0 || i > fieldArr.length) {
			return;
		}	

		setFieldIdx(i);

		setCompArr(compareopers[fieldArr[i].type]);
	}, [fieldArr]);

	const compOpts = useMemo(() => {
		const		rarr = [];

		if (!compArr || !Array.isArray(compArr)) {
			return rarr;
		}

		for (let i = 0; i < compArr.length; ++i) {
			rarr.push({ label : compArr[i].desc, value : i });
		}	

		return rarr;
	
	}, [compArr]);	

	const onCompChange = useCallback((e) => {
		const		i = Number(e.target.value);

		if (Number.isNaN(i) || i < 0 || i > compArr.length) {
			return;
		}	

		setCompIdx(i);
	}, [compArr]);

	const enableFieldExpr = useCallback((checked) => setFieldExpr(checked), []);

	const onFieldExprChange = useCallback((value) => {
		const		i = Number(value);

		if (Number.isNaN(i) || i < 0 || i >= fieldArr.length) {
			return;
		}	

		if (fieldIdx >= 0 && compIdx >= 0 && compArr) {
			setCriterion(`${fieldArr[i].field}`);
		}	
	}, [fieldArr, fieldIdx, compIdx, compArr]);

	const onEnumChange = useCallback((valarr) => {
		if (!Array.isArray(valarr)) {
			return;
		}
		
		let			fval = '', cnt = 0;

		for (let value of valarr) {
			const		i = Number(value);

			if (Number.isNaN(i)) {
				fval += `${cnt > 0 ? ',' : ''} '${value}'`; 
			}
			else {
				fval += `${cnt > 0 ? ',' : ''} ${i}`; 
			}	

			cnt++;
		}

		if (fieldIdx >= 0 && compIdx >= 0 && compArr) {
			objref.current.enumCrit = fval;
		}	
	}, [fieldIdx, compIdx, compArr, objref]);

	const onEnumDropdown = useCallback((open) => {
		if (!open && objref.current.enumCrit) {
			setCriterion(objref.current.enumCrit);
		}	
	}, [objref]);	

	const fieldInputCB = useCallback((input) => {

		if (fieldIdx >= 0 && fieldIdx < fieldArr.length) {
			if (typeof fieldArr[fieldIdx].valid === 'function') {

				const		emsg = fieldArr[fieldIdx].valid(input, fieldArr[fieldIdx].field);

				if (emsg !== true) {
					notification.error({message : "Input Format Error", description : emsg});
					return;
				}	
			}	

			if (fieldArr[fieldIdx].type === 'string') {
				if (compIdx >= 0 && compArr && compArr[compIdx] && compArr[compIdx].oper.includes('in')) {
					setCriterion(splitInArrayChecked(input));
				}
				else if (input[0] === "'") {
					setCriterion(input);
				}
				else {
					setCriterion(`'${input}'`);
				}
			}
			else if (fieldArr[fieldIdx].type === 'number') {
				const		reg = /^-?\d.*,?/;

				if (reg.test(input)) {
					setCriterion(input);
				}	
				else {
					notification.error({message : "Input Format Error", description : `Input ${input} not a numeric format`});
					return;
				}	
			}	
			else {
				setCriterion(input);
			}	
		}
		
	}, [fieldIdx, fieldArr, compIdx, compArr]);

	const onBoolChange = useCallback((e) => fieldInputCB(e.target.value), [fieldInputCB]);

	const onTimeChange = useCallback((dateObj, dateString) => {
		if (dateString && fieldIdx >= 0 && compIdx >= 0 && compArr) {
			setCriterion(`'${dateString}'`);
		}	
	}, [fieldIdx, compIdx, compArr]);	

	const resetState = useCallback((resetFilter) => {
		setFieldIdx(-1);
		setCompArr();
		setCompIdx(-1);		
		setFieldExpr(false);
		setCriterion('');

		objref.current.enumCrit = '';

		if (resetFilter) {
			setFilterStr('');
			objref.current.nfilters = 0;
		}	
	}, [objref]);	

	useEffect(() => {
		if (criterion.length > 0 && fieldIdx >= 0 && fieldIdx < fieldArr.length && compIdx >= 0 && compArr && compIdx < compArr.length) {
			const		fstr = ` { ${fieldArr[fieldIdx].field} ${compArr[compIdx].oper} ${criterion} } `;

			objref.current.nfilters++;

			setFilterStr((prevStr) => {
				if (prevStr.length > 0) {
					return `(${prevStr} ${objref.current.andOr} ${fstr})`;
				}	

				return fstr;
			});	

			resetState();
		}	
	}, [criterion, fieldArr, fieldIdx, compIdx, compArr, objref, resetState]);	

	let			filelem = null, switchelem = null, tooltip = null;

	if (!isFieldExpr && fieldIdx >= 0 && fieldArr[fieldIdx]?.type === 'boolean') {
		filelem = (
			<Radio.Group onChange={onBoolChange} buttonStyle='solid' disabled={fieldIdx < 0 || compIdx < 0}>
				<Radio.Button value='true'>True</Radio.Button>
				<Radio.Button value='false'>False</Radio.Button>
			</Radio.Group>	
		);
	}	
	else if (!isFieldExpr && fieldIdx >= 0 && fieldArr[fieldIdx]?.type === 'enum' && fieldArr[fieldIdx].esrc) {
		filelem = (
			<>
			<span><i>Select from</i></span>
			<Select style={{ width: 250 }} placeholder="Select one or more values" mode="tags" onChange={onEnumChange} allowClear onDropdownVisibleChange={onEnumDropdown} 
				disabled={fieldIdx < 0 || compIdx < 0} >
				{fieldArr[fieldIdx].esrc.map((item, index) => (
					<Select.Option key={index} value={item.value}>
						{item.name}
					</Select.Option>
				))}
			</Select>
			</>
		);
	}	
	else if (!isFieldExpr && fieldIdx >= 0 && fieldArr[fieldIdx]?.type === 'timestamptz') {
		filelem = <DateTimeZonePicker onChange={onTimeChange} placeholder="Select a Timestamp" disabled={fieldIdx < 0 || compIdx < 0} />
	}	
	else if (!isFieldExpr) {
		let			anystr = '';

		if (compIdx >= 0 && compArr && compArr[compIdx] && compArr[compIdx].oper.includes('in')) {
			anystr = 'one or more comma separated ';
		}

		if (fieldIdx >= 0 && fieldArr[fieldIdx]?.type === 'string') {
			tooltip = `Enter ${anystr.length > 0 ? anystr : 'a '} string`; 
		}	

		if (fieldIdx >= 0 && fieldArr[fieldIdx]?.type === 'number') {
			tooltip = `Enter ${anystr.length > 0 ? anystr : 'a '} number`; 
		}	

		filelem = (
			<>
			<Tooltip title={tooltip}>
			<Search disabled={fieldIdx < 0 || compIdx < 0} maxLength={4096} enterButton={<Button>Add Criterion</Button>} onSearch={fieldInputCB} style={{ width: 500 }} />
			</Tooltip>
			</>
		);
	}	
	else if (isFieldExpr && fieldIdx >= 0) {
		filelem = (
			<Select style={{ width: 250 }} placeholder='Select a Field' onChange={onFieldExprChange} >
				{fieldArr.map((item, index) => (
					<Select.Option key={index} value={index} disabled={item.type !== fieldArr[fieldIdx]?.type || index === fieldIdx} >
						{item.desc}
					</Select.Option>
				))}
			</Select>
		);
	}	

	if (compIdx >= 0 && compArr && compArr[compIdx] && fieldexprvalids[compArr[compIdx].oper]) {
		switchelem = <Switch checked={isFieldExpr} onChange={enableFieldExpr} checkedChildren="Select Field Name to compare" unCheckedChildren="Compare with another field" />; 
	}	

	const onAndOrChange = useCallback((e) => { 
		setAndOr(e.target.value); 
		objref.current.andOr = e.target.value; 
	}, [objref]);

	const onTextAreaChange = useCallback(({ target: { value } }) => {
		setFilterStr(value);
	}, [setFilterStr]);

	const onReset = useCallback(() => {
		resetState(true);
	}, [resetState]);

	const onSubmit = useCallback(() => {
		if (typeof filterCB === 'function' && filterStr.length) {
			filterCB(filterStr);
		}	
	}, [filterCB, filterStr]);

	return (
		<>
		
		<div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', margin: 30 }}>
		<span><strong>Select a Field</strong></span>

		<Radio.Group onChange={onFieldChange} buttonStyle='solid' value={compArr === undefined ? -1 : undefined} >
			{fieldOpts.map((item, index) => (
				<Radio.Button key={index} value={item.value}>{item.label}</Radio.Button>
			))}
		</Radio.Group>	
		</div>

		<div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', margin: 60 }}>
		<Radio.Group onChange={onCompChange} buttonStyle='solid' value={compIdx === -1 ? -1 : undefined} >
			{compOpts.map((item, index) => (
				<Radio.Button key={index} value={item.value}>{item.label}</Radio.Button>
			))}
		</Radio.Group>	
		</div>

		<div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', margin: 60 }}>

		<div>
		{switchelem}
		</div>

		{filelem}

		<Tooltip color="blue" title="Use And/Or to add multile criteria. Select a field to start the new criterion. A mix of And/Or can be used.">
		<Radio.Group onChange={onAndOrChange} defaultValue='and' disabled={objref.current.nfilters === 0}>
			<Radio.Button value='and'>And</Radio.Button>
			<Radio.Button value='or'>Or</Radio.Button>
		</Radio.Group>	
		</Tooltip>

		{objref.current.nfilters > 0 && 
		<span>Select And or Or and then a Field Name to add another Criterion</span>	
		}

		<div style={{ marginTop : 60 }}>
		</div>
		
		<Tooltip color="blue" title="Current Filter String. Filter can be edited if needed.">
		<TextArea value={filterStr} onChange={onTextAreaChange} disabled={objref.current.nfilters === 0} placeholder="Editable Filter String" autoSize={{ minRows: 2, maxRows: 5 }} />
		</Tooltip>

		<div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginTop : 60 }}>
		<Space>
		<>
		<Button disabled={objref.current.nfilters === 0} onClick={onSubmit} >Set Filters</Button>
		<Button disabled={objref.current.nfilters === 0} onClick={onReset} >Reset Filters</Button>
		</>
		</Space>
		</div>

		</div>

		</>
	);
}	


export function SearchTimeFilter({callback, title = 'Search', timecompcb, filtercompcb, aggrfiltercb, rangefiltermandatory = false, ismaxrecs, maxallowedrecs, defaultmaxrecs})
{
	const			[timeobj, settimeobj] = useState(null);
	const			[isfilter, setisfilter] = useState(!!filtercompcb);
	const			[filterstr, setfilterstr] = useState('');
	const			[aggrfilterstr, setaggrfilterstr] = useState('');
	const			[maxrecs, setmaxrecs] = useState(ismaxrecs === true ? defaultmaxrecs ?? maxallowedrecs ?? 10000000 : 10000000);

	const ontimecb = useCallback((date, dateString, useAggr, aggrMin, aggrType) => {
		if (!date || !dateString) {
			return;
		}

		settimeobj({date : date, dateString : dateString, useAggr : useAggr, aggrMin : aggrMin, aggrType : aggrType});
	}, []);


	const onfiltercb = useCallback((newfilter) => {
		setfilterstr(newfilter);
	}, []);

	const onaggrfiltercb = useCallback((newfilter) => {
		setaggrfilterstr(newfilter);
	}, []);


	
	const onsearch =  useCallback(() => {
		if (timeobj && timeobj.date && timeobj.dateString && typeof callback === 'function') {

			const		emsg = callback(timeobj.date, timeobj.dateString, timeobj.useAggr, timeobj.aggrMin, timeobj.aggrType, filterstr, maxrecs, aggrfilterstr);

			if (typeof emsg === 'string') {
				notification.error({message : "Search Parameter Error", description : `Invalid Search Parameters : ${emsg}`});
			}	
		}
	}, [callback, timeobj, filterstr, aggrfilterstr, maxrecs]);	

	let			mrecs = null;

	if (ismaxrecs) {
		mrecs = (
			<>
			<Space>
			<span><i>Max Records to Fetch</i></span>
			<InputNumber min={1} max={maxallowedrecs ?? 10000000} defaultValue={defaultmaxrecs} value={maxrecs} onChange={(val) => {setmaxrecs(val);} } />
			</Space>
			</>
			);
	}	

	return (
		<>
		<div style={{ display: 'flex', justifyContent: 'left', flexWrap: 'wrap', marginTop: 30, marginBottom: 30 }}>
		<Space direction='vertical'>

		{timecompcb && typeof timecompcb === 'function' && timecompcb(ontimecb)}
		{timeobj && <span><i>Time : {typeof timeobj.dateString === 'string' ? timeobj.dateString : `${timeobj.dateString[0]} - ${timeobj.dateString[1]}` }</i></span>}

		<div style={{ marginTop : 60, marginBottom : 30 }}>
		<Space>
		{timeobj && <Switch checked={isfilter} onChange={(checked) => { rangefiltermandatory !== true && setisfilter(checked); }} 
			checkedChildren={timeobj.useAggr ? "Add Pre-Aggregation Filters" : "Add Filters"} unCheckedChildren="No Filters" /> }
		{isfilter && timeobj && filterstr.length === 0 && filtercompcb && typeof filtercompcb === 'function' && filtercompcb(onfiltercb)}
		{isfilter && filterstr.length > 0 && <Button onClick={() => setfilterstr('')}>Reset Filters</Button>}
		</Space>

		{isfilter && filterstr.length > 0 && (
		<>
		<div style={{ marginTop : 30 }}> <span><i>{`Filters Set : ${strTruncateTo(filterstr, 120)}`}</i></span> </div>
		</>
		)}
		</div>


		<div style={{ marginBottom : 30 }}>
		{aggrfilterstr.length === 0 && aggrfiltercb && typeof aggrfiltercb === 'function' && timeobj && timeobj.useAggr && aggrfiltercb(onaggrfiltercb)}
		{aggrfilterstr.length > 0 && <Button onClick={() => setaggrfilterstr('')}>Reset Aggregation Filters</Button>}
		</div>

		{timeobj && mrecs}

		<div style={{ marginTop : 60, marginBottom : 30 }}>
		<Popover content={`Please select the time point or range and ${rangefiltermandatory === true ? 'mandatory' : 'optional'} filters`} title={title} >
		<Button type="primary" onClick={onsearch} 
				disabled={((timeobj === null) || (rangefiltermandatory === true && (safetypeof(timeobj.date) === 'array') && filterstr.length === 0))}>Search</Button>
		</Popover>
		</div>

		</Space>
		</div>

		</>
	);
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

export function getFieldsExcludingHost(fieldarr)
{
	return fieldarr.filter((col) => col.field !== 'host' && col.field !== 'cluster' && col.field !== 'parid');
}	

const presetChangeTimeRange = [
	{ desc : 'Previous 1 min', 	timeoffsetsec : '-60' },	
	{ desc : 'Previous 5 mins', 	timeoffsetsec : '-300' },	
	{ desc : 'Previous 15 mins',	timeoffsetsec : '-900' },	
	{ desc : 'Previous 30 mins',	timeoffsetsec : '-1800' },	
	{ desc : 'Previous 60 mins',	timeoffsetsec : '-3600' },	
	{ desc : 'Next 1 min', 		timeoffsetsec : '60' },	
	{ desc : 'Next 5 mins', 	timeoffsetsec : '300' },	
	{ desc : 'Next 15 mins',	timeoffsetsec : '900' },	
	{ desc : 'Next 30 mins',	timeoffsetsec : '1800' },	
	{ desc : 'Last 1 min', 		timeoffsetsec : '100060' },	
	{ desc : 'Last 5 mins', 	timeoffsetsec : '100300' },	
	{ desc : 'Last 15 mins',	timeoffsetsec : '100900' },	
	{ desc : 'Last 30 mins',	timeoffsetsec : '101800' },	
];


export function SearchWrapConfig({starttime, endtime, maxrecs, recoffset, origComp, ...props})
{
	const [{tstart, tend, currmax, offset}, 
			setstate] 	= useState({tstart : starttime, tend : endtime, currmax : maxrecs, offset : recoffset > 0 ? recoffset : 0 });

	const [nrows, setnrows]		= useState(0);
	const [form] 			= Form.useForm();
	const objref 			= useRef({ tstart : starttime, tend :  endtime });
	const Comp 			= origComp;

	const onFinish = useCallback((values) => {
		setstate({ tstart : objref.current.tstart, tend : objref.current.tend, currmax : Number(values.maxrecs), offset : 0});
	}, [objref, setstate]);

	const onPresetRangeChange = useCallback((value) => {
		const			secoff = Number(value);
		const			start = tstart ?? moment().format(); 
		const			end = tend ?? moment().format(); 

		if (secoff < 0) {
			objref.current.tstart 	= moment(start, moment.ISO_8601).add(secoff, 'seconds').format();
			objref.current.tend	= start;
		}	
		else {
			if (secoff > 100000) {
				objref.current.tstart	= moment().subtract(secoff - 100000, 'seconds').format();
				objref.current.tend 	= moment().format();
			}
			else {
				objref.current.tstart	= end;
				objref.current.tend 	= moment(end, moment.ISO_8601).add(secoff, 'seconds').format();
			}
		}
	}, [objref, tstart, tend]);	
	
	const onRangeChange = useCallback((dateObjs) => {
		if (safetypeof(dateObjs) !== 'array') {
			return;
		}

		objref.current.tstart 	= dateObjs[0].format();
		objref.current.tend	= dateObjs[1].format();

	}, [objref]);	

	const dataRowsCb = useCallback(val => setnrows(Number(val)), [setnrows]);

	const component = useMemo(() => {

		return <Comp {...props} starttime={tstart} endtime={tend} maxrecs={currmax} recoffset={offset > 1 ? offset : undefined} dataRowsCb={dataRowsCb} />;

	}, [tstart, tend, currmax, offset, props, dataRowsCb]);	

	if (!Comp) return null;

	return (
		<>
		<ErrorBoundary>

		{nrows >= 0 && (
		
		<>
		<div style={{ marginLeft: 30, marginRight: 30, marginBottom : 30, border: '1px dotted #7a7aa0', padding : 10 }} >

		<Form {...formItemLayout} form={form} name="search" onFinish={onFinish} scrollToFirstError >
			<Form.Item label="Change Search Time Range">
				<Space>
				
				<PresetTimesOrRanges isrange={true} secOffsetCB={onPresetRangeChange} presetArray={presetChangeTimeRange} />
				<span> OR </span>
				<RangeTimeZonePicker onChange={onRangeChange} disableFuture={true} />

				</Space>
			</Form.Item>

			<Form.Item label="Change Max Records to Fetch" name="maxrecs" initialValue={maxrecs ? maxrecs.toString() : "10000"}>
				<InputNumber min={1} max={10000000} />
			</Form.Item>

			<Form.Item {...tailFormItemLayout}>
				<Button htmlType="submit" >Update Search</Button>
			</Form.Item>
		</Form>

		</div>
		</>
		)}

		{component}

		{nrows > 0 && currmax > 0 && (
			<div style={{ marginLeft: 30, marginRight: 30, marginBottom : 30, border: '1px dotted #7a7aa0', padding : 10, 
					display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap'}} >
			<>		
			<Button onClick={() => setstate(prevstate => ({...prevstate, offset : offset - currmax}))} 
							disabled={offset < currmax}>Get Previous {currmax} records within same time range</Button>
			<span>Record Range Returned : {offset + 1} to {nrows + offset}</span>
			<Button onClick={() => setstate(prevstate => ({...prevstate, offset : offset + currmax}))}
							disabled={nrows < currmax}>Get Next {currmax} records within same time range</Button>
			</>
			</div>
		)}

		</ErrorBoundary>
		</>
	);

}
export function GenericSearchWrap({...props})
{
	const [key, setkey]			= useState(0);
	
	const resetCB = () => setkey(key + 1);

	return <GenericSearch {...props} key={key} resetCB={resetCB} />;
}	

export function GenericSearch({inputCategory, inputSubsys, maxrecs, title, addTabCB, remTabCB, isActiveTabCB, resetCB})
{
	const [form] 					= Form.useForm();
	const objref 					= useRef(null);
	const [category, setCategory]			= useState(inputCategory ?? "service");
	const [subsys, setSubsys]			= useState(inputSubsys ?? "extsvcstate");
	const [isrange, setIsrange]			= useState(true);
	const [timerange, setTimerange]			= useState([]);
	const [canaggr, setcanagg]			= useState(false);
	const [useAggr, setUseAggr]			= useState(false);
	const [filterstr, setfilterstr] 		= useState('');
	const [custaggrdef, setcustaggrdef]		= useState();
	const [aggrfilterstr, setaggrfilterstr] 	= useState('');
	const [sortcol, setsortcol]			= useState('');
	
	if (objref.current === null) {
		objref.current = {
			subsysobj		:	getSubsysHandlers(subsys),
			customcols		:	null,
			customtablecols		:	null,
			sortdir			:	null,
		}	
	}

	const onFinish = useCallback((values) => {
		console.log('Received values of form: ', values);

		if (!objref.current.subsysobj || typeof objref.current.subsysobj.tablecb !== 'function') return;
	
		let		aggrMin;

		if (useAggr && Number(values.aggrdur) > 0) {
			if (values.aggrunit === 'nostep') {
				aggrMin = 365 * 24 * 60;
			}	
			else if (values.aggrunit === 'day') {
				aggrMin = Number(values.aggrdur) * 1440;
			}	
			else if (values.aggrunit === 'hrs') {
				aggrMin = Number(values.aggrdur) * 60;
			}
			else {
				aggrMin = Number(values.aggrdur);
			}	
		}	

		return objref.current.subsysobj.tablecb(
			{
				starttime 		: timerange[0].format(),
				endtime 		: timerange[1].format(),
				useAggr			: canaggr ? useAggr : undefined, 
				aggrMin			: aggrMin, 
				aggrType		: values.aggrType,
				filter 			: filterstr, 
				aggrfilter		: aggrfilterstr, 
				maxrecs			: Number(values.maxrecs), 
				customColumns		: custaggrdef,
				customTableColumns	: custaggrdef ? objref.current.customtablecols : undefined,
				sortColumns		: sortcol ? [sortcol] : undefined,
				sortDir			: objref.current.sortdir ? [objref.current.sortdir] : undefined,
				addTabCB, 
				remTabCB, 
				isActiveTabCB,

				wrapComp		: SearchWrapConfig,
			}
		);

	}, [objref, timerange, canaggr, useAggr, filterstr, aggrfilterstr, custaggrdef, sortcol, addTabCB, remTabCB, isActiveTabCB]);

	const onTimerangeChange = useCallback((dateObjs) => {
		if ((safetypeof(dateObjs) !== 'array') || (dateObjs.length !== 2)) {
			return;
		}	

		setTimerange(dateObjs);

		if (dateObjs[0].unix() + 60 <= dateObjs[1].unix() && objref.current.subsysobj?.aggrfields !== undefined) {
			setcanagg(true);
		}	
		else {
			setcanagg(false);
		}	
	}, [objref]);	


	const onNewSubsystem = useCallback((newsub) => {
		setSubsys(newsub);
		objref.current.subsysobj = getSubsysHandlers(newsub);
			
		// Skip aggregation for non supported subsystems or for Alert category
		if (!objref.current.subsysobj.aggrfields || !isrange || newsub === 'alerts') {
			setcanagg(false);
			setUseAggr(false);
		}	
		else {
			setcanagg(true);
		}	

		objref.current.customcols 	= null;
		objref.current.customtablecols 	= null;
		objref.current.sortdir 		= null;

		setfilterstr();
		setaggrfilterstr();
		setcustaggrdef();	
		setsortcol();

		if (objref.current.subsysobj.isnotime === true) {
			onTimerangeChange([moment().subtract(5, 'seconds'), moment()]);
		}	

	}, [objref, isrange, onTimerangeChange]);	

	const onCategoryChange = useCallback((e) => { 
		const 		val = e.target.value;
		const		newsub = getSubsysFromCategory(val)[0]?.value;

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

	const onisrangeChange = useCallback((e) => { 
		const 		val = e.target.value;

		setIsrange(val === 'range'); 

		if (val !== 'range') {
			objref.current.customcols 	= null;
			objref.current.customtablecols 	= null;
			objref.current.sortdir 		= null;

			setcanagg(false);
			setaggrfilterstr();
			setcustaggrdef();	
			setsortcol();
		}	
		else {
			setcanagg(false);	// Set as false
			setsortcol();
		}	
	}, [objref]);	

	const onPresetRangeChange = useCallback((value) => {
		const		now = moment();
		const		mom = moment().subtract(Number(value), 'seconds');

		onTimerangeChange([mom, now]);
	}, [onTimerangeChange]);	

	const onRangeChange = useCallback((dateObjs) => {
		if (safetypeof(dateObjs) !== 'array') {
			return;
		}

		onTimerangeChange(dateObjs);
	}, [onTimerangeChange]);	

	const onPresetTimeChange = useCallback((value) => {
		const		mom = moment().subtract(Number(value), 'seconds');

		onTimerangeChange([mom, mom]);
	}, [onTimerangeChange]);	

	const onTimeChange = useCallback((dateObj) => {
		if (safetypeof(dateObj) !== 'object') {
			return;
		}

		onTimerangeChange([dateObj, dateObj]);
	}, [onTimerangeChange]);	

	const onUseAggrChange = useCallback((value) => {
		setUseAggr(value);
	}, []);	

	const onfiltercb = useCallback((newfilter) => {
		setfilterstr(newfilter);
	}, []);

	const onaggrfiltercb = useCallback((newfilter) => {
		setaggrfilterstr(newfilter);
	}, []);

	const onCustomAggr = useCallback((newcolarr, newfieldarr, newtablecolarr) => {
		objref.current.customcols 	= newfieldarr;
		objref.current.customtablecols 	= newtablecolarr;
		objref.current.sortdir 		= null;

		setcustaggrdef(newcolarr);

		setaggrfilterstr();
		setsortcol();
	}, [objref]);	

	const onFilterStrChange = useCallback(({ target: { value } }) => {
		setfilterstr(value);
	}, []);

	const onAggrFilterStrChange = useCallback(({ target: { value } }) => {
		setaggrfilterstr(value);
	}, []);


	let 			SubsysFilterCB, SubsysAggrFilterCB, outputfields;
	
	if (objref.current.subsysobj) {
		SubsysFilterCB = objref.current.subsysobj.filtercb;	
		
		if (canaggr && useAggr) {
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

	return (
		<>
		<ErrorBoundary>

		<Title level={4} style={{ textAlign : 'center', marginBottom : 30, }} ><em>{title ?? "Global Search"}</em></Title>
		
		<Form {...formItemLayout} form={form} name="search" onFinish={onFinish} scrollToFirstError >

			<Form.Item name="category" label="Select Subsystem Category" initialValue={inputCategory ?? "service"} >
				<Radio.Group onChange={onCategoryChange} disabled={!!inputCategory}>
					{subsysCategories.map(item => (
						<Radio.Button key={item.value} value={item.value}>
							{item.name}
						</Radio.Button>
					))}				
				</Radio.Group>
			</Form.Item>

			<Form.Item name="subsys" label="Select Subsystem" initialValue={inputSubsys ?? "extsvcstate"} >
				<Radio.Group onChange={onSubsysChange} disabled={!!inputSubsys}>
					{getSubsysFromCategory(category).map(item => (
						<Radio.Button key={item.value} value={item.value}>
							{item.name}
						</Radio.Button>
					))}				
				</Radio.Group>
			</Form.Item>

			{!objref.current.subsysobj.isnotime && 
			<Form.Item name="isrange" label="Time Range or a Specific Time" initialValue="range" >
				<Radio.Group onChange={onisrangeChange}>
					<Radio.Button value="range">Time Range</Radio.Button>
					<Radio.Button value="point">Specific Time</Radio.Button>
				</Radio.Group>
			</Form.Item>
			}

			{isrange && !objref.current.subsysobj.isnotime &&
			<Form.Item label="Select Time Range">
				<Space>
				
				<PresetTimesOrRanges isrange={true} secOffsetCB={onPresetRangeChange} />
				<span> OR </span>
				<RangeTimeZonePicker onChange={onRangeChange} disableFuture={true} />

				{timerange.length > 0 && 
				<span>(Time Set as {timerange[0].format("MMM DD HH:mm:ss Z")} to {timerange[1].format("MMM DD HH:mm:ss Z")})</span> 
				}
				</Space>
			</Form.Item>
			}
			
			{!isrange && !objref.current.subsysobj.isnotime &&
			<Form.Item label="Select Specific Time">
				<Space>
				
				<PresetTimesOrRanges isrange={false} secOffsetCB={onPresetTimeChange} />
				<span> OR </span>
				<DateTimeZonePicker onChange={onTimeChange} disableFuture={true} />

				{timerange.length > 0 && 
				<span>(Time Set as {timerange[0].format("MMM Do HH:mm:ss Z")})</span> 
				}
				</Space>
			</Form.Item>
			}

			{canaggr && 
			<Form.Item name="useAggr" label="Apply DB Aggregation" valuePropName="checked" initialValue={false} >
				<Space>
				<Switch onChange={onUseAggrChange} />
				
				{!useAggr && <span>(Enable to limit the number of records to fetch)</span>}
				</Space>
			</Form.Item>
			}

			{canaggr && useAggr && 
			<Form.Item label="Aggregation Step Interval">
				<Space>
				<Form.Item name="aggrdur" noStyle initialValue="5">
					<InputNumber min={1} />
				</Form.Item>	

				<Form.Item name="aggrunit" noStyle initialValue="min">
					<Radio.Group>
					<Radio.Button value="min">Minutes</Radio.Button>
					<Radio.Button value="hrs">Hours</Radio.Button>
					<Radio.Button value="day">Days</Radio.Button>
					<Radio.Button value="nostep">No Step</Radio.Button>
					</Radio.Group>
				</Form.Item>	

				<span>(Aggregation Periods within the selected Time range : No Step implies single aggregate over entire Time range)</span>

				</Space>
			</Form.Item>
			}

			{SubsysFilterCB && timerange.length > 0 &&
			<Form.Item label={canaggr ? "Optional Pre-Aggregation Filters" : "Optional Filters"} >
				<Space>

				{!filterstr && <SubsysFilterCB filterCB={onfiltercb} linktext={canaggr ? "Pre-Aggregation Advanced Filters" : "Advanced Filters"} quicklinktext="Quick Filters" />}
				{filterstr && (
					<Button onClick={() => setfilterstr()} >{canaggr ? "Reset Pre-Aggregation Filters" : "Reset Filters"}</Button>
				)}
				
				{!filterstr && <span>(Optional Filters to limit the number of records)</span>}
				</Space>
			</Form.Item>
			}

			{filterstr &&
			<Form.Item label={canaggr ? "Current Editable Pre-Aggregation Filters" : "Current Editable Filters"} >
				<TextArea value={filterstr} onChange={onFilterStrChange} autoSize={{ minRows: 1, maxRows: 6 }} style={{ maxWidth : '80%' }} />
			</Form.Item>
			}

			{canaggr && useAggr && 
			<Form.Item name="aggrType" label="Default Numerical Aggregation Operator" initialValue="avg">
				<Radio.Group>
				<Radio.Button value='avg'>Average of Interval</Radio.Button>
				<Radio.Button value='max'>Max of Interval</Radio.Button>
				<Radio.Button value='min'>Min of Interval</Radio.Button>
				<Radio.Button value='sum'>Sum of Interval</Radio.Button>
				</Radio.Group>
			</Form.Item>
			}

			{SubsysAggrFilterCB && timerange.length > 0 && canaggr && useAggr &&
			<Form.Item label="Optional Custom Aggregation Fields" >
				<Space>
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

				{!custaggrdef && <span>(Use in case Custom columns needed based on Aggregation Operations)</span>}

				</Space>
			</Form.Item>
			}

			{SubsysAggrFilterCB && timerange.length > 0 && canaggr && useAggr &&
			<Form.Item label="Optional Post-Aggregation Filters" >
				<Space>

				{!aggrfilterstr && <SubsysAggrFilterCB filterCB={onaggrfiltercb} linktext="Post Aggregation Filters" 
					subsysFields={custaggrdef ? objref.current.customcols : undefined} title="Aggregation Filters" />}
				{aggrfilterstr && (
					<Button onClick={() => setaggrfilterstr()} >Reset Post Aggregation Filters</Button>
				)}

				{!aggrfilterstr && <span>(Optional Filters after Aggregation is done)</span>}
				</Space>
			</Form.Item>
			}

			{aggrfilterstr && useAggr &&
			<Form.Item label="Current Editable Post Aggregation Filters" >
				<TextArea value={aggrfilterstr} onChange={onAggrFilterStrChange} autoSize={{ minRows: 1, maxRows: 6 }} style={{ maxWidth : '80%' }} />
			</Form.Item>
			}

			{timerange.length > 0 && outputfields && 
			<Form.Item label="Optional Output Sort Options" >

				{!sortcol && <SortColumnModal doneCB={(col, dir) => { objref.current.sortdir = dir; setsortcol(col); }} linktext="Sort Column" 
					subsysFields={outputfields} />}
				{sortcol && (
					<>
					<Space>
					<Button onClick={() => { objref.current.sortdir = null; setsortcol(); }} >Reset Sort Options</Button>
					<span>({capitalFirstLetter(objref.current.sortdir)} Sort on {sortcol} set...)</span>
					</Space>
					</>
				)}
				
			</Form.Item>
			}

			{timerange.length > 0 &&
			<Form.Item label="Max Records to Fetch" name="maxrecs" initialValue={maxrecs ? maxrecs.toString() : "10000"}>
				<InputNumber min={1} max={maxrecs ?? 100000} />
			</Form.Item>
			}	

			<Form.Item {...tailFormItemLayout}>
				<>
				<Space>
				<Button htmlType="submit" disabled={!timerange || timerange.length === 0}>Search</Button>

				{typeof resetCB === 'function' && (
					<Button onClick={resetCB} >Reset</Button>
				)}
				</Space>
				</>
			</Form.Item>
		</Form>

		</ErrorBoundary>
		</>
	);
}	

