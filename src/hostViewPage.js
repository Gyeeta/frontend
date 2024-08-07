
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {Typography, Space, Switch, Button, Empty, Tag, Popover, Alert, Modal, notification, Card, Descriptions, Slider, Statistic, Row, Col, Input } from 'antd';
import { CheckSquareTwoTone, CloseOutlined } from '@ant-design/icons';

import {useMediaQuery} from 'react-responsive';
import moment from 'moment';
import axios from 'axios';
import {format} from "d3-format";

import {useFetchApi, ComponentLife, ButtonModal, safetypeof, CreateLinkTab, CreateTab, validateApi, mergeMultiMadhava, msecStrFormat,
	capitalFirstLetter, fixedArrayAddItems, stateEnum, ButtonJSONDescribe, LoadingAlert, getErrorString, JSONDescription, getLocalTime} from './components/util.js';
import {GenericSearchWrap} from './multiFilters.js';
import {HostMonitor} from './hostMonitor.js';
import {StateBadge} from './components/stateBadge.js';
import {GyTable, getTableScroll} from './components/gyTable.js';
import {NodeApis} from './components/common.js';
import {SvcDashboard, svcTableTab} from './svcDashboard.js';
import {CPUMemPage, cpumemTableTab} from './cpuMemPage.js';
import {ProcDashboard, procTableTab} from './procDashboard.js';
import {NetDashboard} from './netDashboard.js';
import {MultiFilters, SearchWrapConfig} from './multiFilters.js';

import './hostViewPage.css';

const {Title, Text} = Typography;
const {ErrorBoundary} = Alert;
const {Search} = Input;

export const hoststatefields = [
	{ field : 'state',		desc : 'Host State',		type : 'enum',		subsys : 'hoststate',	valid : null, 		esrc : stateEnum},
	{ field : 'nlistissue',		desc : '# Service Issues',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nlistsevere',	desc : '# Severe Services',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nlisten',		desc : '# Total Services',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nprocissue',		desc : '# Process Issues',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nprocsevere',	desc : '# Severe Processes',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nproc',		desc : '# Total Processes',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'cpudelms',		desc : 'Host CPU Delay msec',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'vmdelms',		desc : 'Memory Delay msec',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'iodelms',		desc : 'Block IO Delay msec',	type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'cpuissue',		desc : 'Host CPU Issue',	type : 'boolean',	subsys : 'hoststate',	valid : null, },
	{ field : 'severecpu',		desc : 'Host Severe CPU',	type : 'boolean',	subsys : 'hoststate',	valid : null, },
	{ field : 'memissue',		desc : 'Host Memory Issue',	type : 'boolean',	subsys : 'hoststate',	valid : null, },
	{ field : 'severemem',		desc : 'Host Severe Memory',	type : 'boolean',	subsys : 'hoststate',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of event',	type : 'timestamptz',	subsys : 'hoststate',	valid : null, },
];

export const aggrhoststatefields = [
	{ field : 'nlistissue',		desc : '# Service Issues',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nlistsevere',	desc : '# Severe Services',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nlisten',		desc : '# Total Services',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nprocissue',		desc : '# Process Issues',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nprocsevere',	desc : '# Severe Processes',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'nproc',		desc : '# Total Processes',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'cpudelms',		desc : 'Host CPU Delay msec',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'vmdelms',		desc : 'Memory Delay msec',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'iodelms',		desc : 'Block IO Delay msec',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'issue',		desc : '# Times Host Issue',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'cpuissue',		desc : '# Times CPU Issue',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'severecpu',		desc : '# Times Severe CPU',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'memissue',		desc : '# Times Memory Issue',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'severemem',		desc : '# Times Severe Memory',		type : 'number',	subsys : 'hoststate',	valid : null, },
	{ field : 'inrecs',		desc : '# Records for Aggregation',	type : 'number',	subsys : 'hoststate',	valid : null, },
];

export const hostinfofields = [
	{ field : 'host',		desc : 'Hostname',			type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'cluster',		desc : 'Cluster Name',			type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'region',		desc : 'Region Name',			type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'zone',		desc : 'Zone Name',			type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'dist',		desc : 'OS Distribution',		type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'kernverstr',		desc : 'Kernel Version String',		type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'cputype',		desc : 'Processor Type',		type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'coreson',		desc : '# Cores Online',		type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'coresoff',		desc : '# Cores Offline',		type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'maxcore',		desc : '# Total Cores',			type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'rammb',		desc : 'Total RAM in MB',		type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'boot',		desc : 'Host Boot Time',		type : 'timestamptz',	subsys : 'hostinfo',	valid : null, },
	{ field : 'virt',		desc : 'Is CPU Virtualized',		type : 'boolean',	subsys : 'hostinfo',	valid : null, },
	{ field : 'virttype',		desc : 'Virtualization Type',		type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'instanceid',		desc : 'Cloud Instance ID',		type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'cloudtype',		desc : 'Cloud Type',			type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'nnuma',		desc : '# NUMA Nodes',			type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'corram',		desc : 'Corrupted RAM in MB',		type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'thrcore',		desc : '# CPU Threads per core',	type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'sockcore',		desc : 'Max CPU Cores per Socket',	type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'isocore',		desc : '# Isolated Cores',		type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'parid',		desc : 'Host Partha Gyeeta ID',		type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'madid',		desc : 'Host Madhava Gyeeta ID',	type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'kernvernum',		desc : 'Kernel Version as Number',	type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'cpuvend',		desc : 'CPU Vendor String',		type : 'string',	subsys : 'hostinfo',	valid : null, },
	{ field : 'l1kb',		desc : 'L1 Data Cache KB',		type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'l2kb',		desc : 'L2 Cache KB',			type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'l3kb',		desc : 'L3 Cache KB',			type : 'number',	subsys : 'hostinfo',	valid : null, },
	{ field : 'l4kb',		desc : 'L4 Cache KB',			type : 'number',	subsys : 'hostinfo',	valid : null, },
];


const hostColumns = (isglob = true) => {
	const			globcol = isglob ? [
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		render : 	text => <Button type="link">{text}</Button>,
		fixed : 	'left',
		width :		150,
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		fixed : 	'left',
		width :		150,
	},
	] : [];

	
	return [
	...globcol,
	{
		title :		'Host State',
		key :		'state',
		dataIndex :	'state',
		gytype :	'string',
		width : 	100,
		render : 	state => StateBadge(state, state),
	},	
	{
		title :		'# Service Issues',
		key :		'nlistissue',
		dataIndex :	'nlistissue',
		gytype :	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Process Issues',
		key :		'nprocissue',
		dataIndex :	'nprocissue',
		gytype :	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Host CPU Delays',
		key :		'cpudelms',
		dataIndex :	'cpudelms',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num),
		responsive : 	['lg'],
	},
	{
		title :		'Memory Delays',
		key :		'vmdelms',
		dataIndex :	'vmdelms',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num),
		responsive : 	['lg'],
	},
	{
		title :		'Disk IO Delays',
		key :		'iodelms',
		dataIndex :	'iodelms',
		gytype :	'number',
		width : 	120,
		render :	(num) => msecStrFormat(num),
		responsive : 	['lg'],
	},
	{
		title :		'Host CPU Issue',
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'boolean',
		width : 	100,
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor={rec.severecpu ? 'bold red' : 'red'}  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		responsive : 	['lg'],
	},
	{
		title :		'Host Mem Issue',
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'boolean',
		width : 	100,
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor={rec.severecpu ? 'bold red' : 'red'}  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		responsive : 	['lg'],
	},
	{
		title :		'# Severe Services',
		key :		'nlistsevere',
		dataIndex :	'nlistsevere',
		gytype :	'number',
		responsive : 	['lg'],
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Total Services',
		key :		'nlisten',
		dataIndex :	'nlisten',
		gytype :	'number',
		responsive : 	['lg'],
		width : 	100,
		render : 	!isglob ? ((num) => <Button type="link">{num}</Button>) : undefined,
	},

	{
		title :		'# Severe Processes',
		key :		'nprocsevere',
		dataIndex :	'nprocsevere',
		gytype :	'number',
		responsive : 	['lg'],
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Total Processes',
		key :		'nproc',
		dataIndex :	'nproc',
		gytype :	'number',
		width : 	100,
		responsive : 	['lg'],
	},

	];
};	

export const hostTimeColumns = (isglob = true) => {
	return [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		width :		140,
		fixed : 	'left',
		render :	(val) => getLocalTime(val),
	},
	...hostColumns(isglob),

	];
};	

const hostRangeColumns = (aggrType) => {
	aggrType = capitalFirstLetter(aggrType) ?? 'Avg';

	return [
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		fixed : 	'left',
		width :		150,
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		fixed : 	'left',
		width :		150,
	},
	{
		title :		'# Bad States',
		key :		'detailissues',
		dataIndex :	'detailissues',
		gytype :	'number',
		render :	(num, rec) => <Button type="link"><span style={{ color : num > 0 ? 'red' : undefined }} >{num} of {rec.detailrecs}</span></Button>,
		width : 	100,
	},	
	{
		title :		`${aggrType} Service Issues`,
		key :		'listissue',
		dataIndex :	'listissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} Process Issues`,
		key :		'procissue',
		dataIndex :	'procissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} CPU Delays`,
		key :		'cpudelms',
		dataIndex :	'cpudelms',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
		width : 	100,
	},
	{
		title :		`${aggrType} Memory Delays`,
		key :		'vmdelms',
		dataIndex :	'vmdelms',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
		width : 	100,
	},
	{
		title :		`${aggrType} Disk IO Delays`,
		key :		'iodelms',
		dataIndex :	'iodelms',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
		width : 	100,
	},
	{
		title :		`${aggrType} CPU Issues`,
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} Memory Issues`,
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} Severe Service Issues`,
		key :		'listsevere',
		dataIndex :	'listsevere',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} Severe Process Issues`,
		key :		'procsevere',
		dataIndex :	'procsevere',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},

	];
};	

const hostRangeNoSummColumns = (aggrType, isglob = true) => {
	const			globcol = isglob ? [
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		render : 	text => <Button type="link">{text}</Button>,
		fixed : 	'left',
		width :		150,
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		fixed : 	'left',
		width :		150,
	},
	] : [];

	aggrType = capitalFirstLetter(aggrType) ?? 'Avg';

	return [
	...globcol,
	{
		title :		'# Bad States',
		key :		'issue',
		dataIndex :	'issue',
		gytype :	'number',
		render :	(num, rec) => <Button type="link"><span style={{ color : num > 0 ? 'red' : undefined }} >{num} of {rec.inrecs}</span></Button>,
		width : 	120,
	},	
	{
		title :		`${aggrType} Service Issues`,
		key :		'nlistissue',
		dataIndex :	'nlistissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} Process Issues`,
		key :		'nprocissue',
		dataIndex :	'nprocissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} CPU Delays`,
		key :		'cpudelms',
		dataIndex :	'cpudelms',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
		width : 	100,
	},
	{
		title :		`${aggrType} Memory Delays`,
		key :		'vmdelms',
		dataIndex :	'vmdelms',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
		width : 	100,
	},
	{
		title :		`${aggrType} Disk IO Delays`,
		key :		'iodelms',
		dataIndex :	'iodelms',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => msecStrFormat(num),
		width : 	100,
	},
	{
		title :		`${aggrType} CPU Issues`,
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} Mem Issues`,
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
		width : 	100,
	},
	{
		title :		`${aggrType} Total Services`,
		key :		'nlisten',
		dataIndex :	'nlisten',
		gytype :	'number',
		responsive : 	['lg'],
		render : 	!isglob ? ((num) => <Button type="link">{num}</Button>) : undefined,
		width : 	100,
	},
	{
		title :		`${aggrType} Total Processes`,
		key :		'nproc',
		dataIndex :	'nproc',
		gytype :	'number',
		responsive : 	['lg'],
		width : 	100,
	},

	];
};	


export const hostRangeTimeColumns = (aggrType, isglob = true) => {
	return [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		render : 	!isglob ? ((text) => getLocalTime(text)) : undefined,
		width :		160,
		fixed : 	'left',
	},
	...hostRangeNoSummColumns(aggrType, isglob),
	];
};	


function BootFieldSorter(a, b)
{
	return GyTable.DateISOCompare(a["boot"], b["boot"]);
}


const hostInfoColumns = [
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
		title :		'Region Name',
		key :		'region',
		dataIndex :	'region',
		gytype :	'string',
		width :		120,
	},
	{
		title :		'Zone Name',
		key :		'zone',
		dataIndex :	'zone',
		gytype :	'string',
		width :		120,
	},
	{
		title :		'OS Distrib',
		key :		'dist',
		dataIndex :	'dist',
		gytype :	'string',
		responsive : 	['lg'],
		width :		120,
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
		title :		'# Cores Online',
		key :		'coreson',
		dataIndex :	'coreson',
		gytype :	'number',
		render : 	(val, rec) => `${val} of ${rec.maxcore}`,
		width :		100,
	},
	{
		title :		'Total RAM MB',
		key :		'rammb',
		dataIndex :	'rammb',
		gytype :	'number',
		render :	(num) => format(",")(num),
		width :		100,
	},
	{
		title :		'Boot Time',
		key :		'boot',
		dataIndex :	'boot',
		gytype :	'string',
		sorter :	BootFieldSorter,
		responsive : 	['lg'],
		width :		160,
	},
	{
		title :		'Processor',
		key :		'cputype',
		dataIndex :	'cputype',
		gytype :	'string',
		responsive : 	['lg'],
		width :		160,
	},
	{
		title :		'Virtualization',
		key :		'virttype',
		dataIndex :	'virttype',
		gytype :	'string',
		responsive : 	['lg'],
		width :		120,
	},
	{
		title :		'Instance ID',
		key :		'instanceid',
		dataIndex :	'instanceid',
		gytype :	'string',
		responsive : 	['lg'],
		width :		140,
	},
	{
		title :		'Cloud Type',
		key :		'cloudtype',
		dataIndex :	'cloudtype',
		gytype :	'string',
		responsive : 	['lg'],
		width :		100,
	},
	{
		title :		'# Isolated Cores',
		key :		'isocore',
		dataIndex :	'isocore',
		gytype :	'number',
		responsive : 	['lg'],
		width :		100,
	},
	{
		title :		'CPU Vendor',
		key :		'cpuvend',
		dataIndex :	'cpuvend',
		gytype :	'string',
		responsive : 	['lg'],
		width :		120,
	},

];

function getInitNormData()
{
	return {
		hoststate 	: [],
		nmadhava	: 0,
		starttime	: '',
		summary 	: {
			nhosts		: 0,
			ntotal_hosts	: 0,
			nhosts_idle	: 0,
			nhosts_good	: 0,
			nhosts_ok	: 0,
			nhosts_bad	: 0,
			nhosts_severe	: 0,
			nprocissue_hosts: 0,
			nmemissue_hosts	: 0,
			ncpuissue_hosts	: 0,
			nlistissue_hosts: 0,
			nlisten		: 0,
			nlisten_issue	: 0,
			nlisten_severe	: 0,
			ncpudelms_hosts : 0,
			nvmdelms_hosts	: 0,
			niodelms_hosts	: 0,
			nhosts_offline	: 0,
		},
	};	
}	

export function getNormParthaHostState(apidata)
{
	let		ndata = getInitNormData();	

	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Host Status data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Host Status Error seen : ${apidata[0].errmsg}`);
	}	

	for (let madhava of apidata) {
		if (madhava.hoststate.length === 0) {
			continue;
		}

		let		summ = getInitNormData().summary;

		for (let partha of madhava.hoststate) {
			summ.nhosts++;

			if (partha.state === 'Idle') {
				summ.nhosts_idle++;
			}
			else if (partha.state === 'Good') {
				summ.nhosts_good++;
			}
			else if (partha.state === 'OK') {
				summ.nhosts_ok++;
			}
			else if (partha.state === 'Bad') {
				summ.nhosts_bad++;
			}
			else if (partha.state === 'Severe') {
				summ.nhosts_severe++;
			}

			if (partha.nprocissue > 0) {
				summ.nprocissue_hosts++;
			}
			if (partha.memissue === true) {
				summ.nmemissue_hosts++;
			}	
			if (partha.cpuissue === true) {
				summ.ncpuissue_hosts++;
			}	
			if (partha.nlistissue > 0) {
				summ.nlistissue_hosts++;
			}	

			if (partha.cpudelms > 0) {
				summ.ncpudelms_hosts++;
			}	

			if (partha.vmdelms > 0) {
				summ.nvmdelms_hosts++;
			}	

			if (partha.iodelms > 0) {
				summ.niodelms_hosts++;
			}	

			summ.nlisten 		+= partha.nlisten;
			summ.nlisten_issue 	+= partha.nlistissue;
			summ.nlisten_severe 	+= partha.nlistsevere;

			ndata.hoststate.push(partha);
		}	

		if (ndata.nmadhava === 0) {
			ndata.starttime 	= madhava.hoststate[0].time;
		}
		
		ndata.nmadhava++;

		ndata.summary.nhosts 		+= summ.nhosts;
		ndata.summary.ntotal_hosts 	+= madhava.ntotal_hosts < summ.nhosts ? summ.nhosts : madhava.ntotal_hosts;
		ndata.summary.nhosts_offline 	+= madhava.nhosts_offline;

		ndata.summary.nhosts_idle 	+= summ.nhosts_idle;
		ndata.summary.nhosts_good 	+= summ.nhosts_good;
		ndata.summary.nhosts_ok 	+= summ.nhosts_ok;
		ndata.summary.nhosts_bad 	+= summ.nhosts_bad;
		ndata.summary.nhosts_severe 	+= summ.nhosts_severe;
		ndata.summary.nprocissue_hosts 	+= summ.nprocissue_hosts;
		ndata.summary.nmemissue_hosts 	+= summ.nmemissue_hosts;
		ndata.summary.ncpuissue_hosts 	+= summ.ncpuissue_hosts;
		ndata.summary.nlistissue_hosts 	+= summ.nlistissue_hosts;
		ndata.summary.nlisten	 	+= summ.nlisten;
		ndata.summary.nlisten_issue	+= summ.nlisten_issue;
		ndata.summary.nlisten_severe 	+= summ.nlisten_severe;
		ndata.summary.ncpudelms_hosts 	+= summ.ncpudelms_hosts;
		ndata.summary.nvmdelms_hosts 	+= summ.nvmdelms_hosts;
		ndata.summary.niodelms_hosts 	+= summ.niodelms_hosts;
	}	

	return ndata;
}	

function getInitNormRange(starttime, endtime, isaggr)
{
	return {
		uniqhosts	: {},
		hoststate	: [],
		nmadhava	: 0,
		starttime	: starttime,
		endtime		: endtime,
		isaggr		: isaggr,

		summary 	: {
			nhosts			: 0,
			nhosts_badstate		: 0,
			nlistissue_hosts	: 0,
			nprocissue_hosts	: 0,
			ncpudelms_hosts		: 0,
			nvmdelms_hosts		: 0,
			niodelms_hosts		: 0,
			nmemissue_hosts		: 0,
			ncpuissue_hosts		: 0,
		},
	};	
}	


export function getNormParthaHostRange(apidata, starttime, endtime, isaggr)
{
	let			ndata = getInitNormRange(starttime, endtime, isaggr);	
	let			summ = ndata.summary;

	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Host Range data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Host Range Error seen : ${apidata[0].errmsg}`);
	}	

	for (let madhava of apidata) {
		if (madhava.hoststate.length === 0) {
			continue;
		}

		for (let partha of madhava.hoststate) {
			let		parsum = ndata.uniqhosts[partha.parid];

			if (parsum === undefined) {
				summ.nhosts++;

				ndata.uniqhosts[partha.parid] =
				{
					parid		: partha.parid,
					host		: partha.host,
					madid		: partha.madid,
					cluster		: partha.cluster,

					badstate	: 0,

					procissue	: 0,
					procsevere	: 0,
					listissue	: 0,
					listsevere	: 0,

					cpuissue	: 0,
					memissue	: 0,
					severecpu	: 0,
					severemem	: 0,

					cpudelms	: 0,
					vmdelms		: 0,
					iodelms		: 0,

					detailissues	: 0,
					detailrecs	: 0,

					recs		: [],
				};

				parsum = ndata.uniqhosts[partha.parid];

				ndata.hoststate.push(parsum);
			}

			parsum.recs.push(partha);

			if (partha.inrecs !== undefined) {
				// If > 10 % issue records mark state as Bad
				if ((partha.issue > 0) && (partha.issue * 10 >= partha.inrecs)) {
					partha.state = 'Bad';
				}	
				else {
					partha.state = 'Good';
				}

				parsum.detailissues += partha.issue;
				parsum.detailrecs += partha.inrecs;
			}	
			else {
				parsum.detailrecs++;
			}	
		
			if ((partha.state === 'Bad') || (partha.state === 'Severe')) {
				if (parsum.badstate === 0) {
					summ.nhosts_badstate++;
				}

				parsum.badstate++;
				
				if (partha.inrecs === undefined) {
					parsum.detailissues++;
				}	
			}

			if (partha.nprocissue > 0) {
				if (parsum.procissue === 0) {
					summ.nprocissue_hosts++;
				}

				parsum.procissue++;

				if (partha.nprocsevere > 0) {
					parsum.procsevere++;
				}	
			}

			if (partha.nlistissue > 0) {
				if (parsum.listissue === 0) {
					summ.nlistissue_hosts++;
				}

				parsum.listissue++;

				if (partha.nlistsevere > 0) {
					parsum.listsevere++;
				}	
			}	

			if (partha.cpuissue) {
				if (parsum.cpuissue === 0) {
					summ.ncpuissue_hosts++;
				}

				parsum.cpuissue++;

				if (partha.severecpu) {
					parsum.severecpu++;
				}	
			}	

			if (partha.memissue) {
				if (parsum.memissue === 0) {
					summ.nmemissue_hosts++;
				}

				parsum.memissue++;

				if (partha.severemem) {
					parsum.severemem++;
				}	
			}	

			if (partha.cpudelms > 0) {
				parsum.ncpudelms_hosts++;
			}	

			if (partha.vmdelms > 0) {
				parsum.nvmdelms_hosts++;
			}	

			if (partha.iodelms > 0) {
				parsum.niodelms_hosts++;
			}	

		}	

		ndata.nmadhava++;
	}	

	return ndata;
}


export function HostViewCard({rec})
{
	const title = <em>{rec.host}</em>;
	const statebadge = StateBadge(rec.state, rec.state);

	return (
		<Card style={{ width: 300 }}>
			<Descriptions title={title} bordered={true} column={1} style={{ textAlign: 'center' }}>
			<Descriptions.Item label={<em>Cluster</em>}><Text ellipsis style={{ width: 90 }}>{rec.cluster}</Text></Descriptions.Item>
			<Descriptions.Item label={<em>Host State</em>}>{statebadge}</Descriptions.Item>
			<Descriptions.Item label={<em>Service Issues</em>}><Text mark>{rec.nlistissue + ' / ' + rec.nlisten }</Text></Descriptions.Item>
			<Descriptions.Item label={<em>Proc Issues</em>}><Text mark>{rec.nprocissue + ' / ' + rec.nproc }</Text></Descriptions.Item>
	    		</Descriptions>
		</Card>	
	);		
}	

function parseHostInfo(apidata)
{
	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Host Info data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Host Info Error seen : ${apidata[0].errmsg}`);
	}	

	if (!(apidata.length === 1 && ('array' === safetypeof(apidata[0].hostinfo)) && ('object' === safetypeof(apidata[0].hostinfo[0])))) {
		return {};
	}	

	return apidata[0].hostinfo[0];
}

function getHostInfoApiConf(parid)
{
	if (!parid) {
		throw new Error(`Mandatory parid property missing for Host Info`);
	}

	return {
		url 	: NodeApis.hostinfo,
		method	: 'post',
		data 	: {
			qrytime		: Date.now(),
			timeoutsec 	: 30,
			parid		: parid,
		},
		timeout	: 30000,
	};	
}	

// Specify hostInfoObj if data already available 
export function HostInfoDesc({parid, addTabCB, remTabCB, isActiveTabCB, hostInfoObj})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi(!hostInfoObj || !parid ? getHostInfoApiConf(parid) : null, parseHostInfo, 
										!hostInfoObj ? [] : [{hostinfo : [hostInfoObj]}], 'Host Info API', !hostInfoObj);

	const getHostMonitorLink = () => {
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State Monitor</i></span>, 'Host State Monitor',
					() => { return <HostMonitor parid={parid} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							/> }, tabKey, addTabCB);
	};
	

	const getCPUMemLink = () => {
		const		tabKey = `CPU_Memory_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host CPU Memory State Monitor</i></span>, 'CPU Memory Monitor',
				() => { return <CPUMemPage parid={parid} isRealTime={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
						/>}, tabKey, addTabCB);
	};
	
	const getServiceLink = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Service Dashboard</i></span>, 'Host Service Dashboard',
					() => { return <SvcDashboard parid={parid} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};
	
	const getProcessLink = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Process Dashboard</i></span>, 'Host Process Dashboard',
					() => { return <ProcDashboard parid={parid} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
						 	/> }, tabKey, addTabCB);
	};

	const getNetFlows = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow Monitor</i></span>, 'Host Network Flow Monitor', 
					() => { return <NetDashboard parid={parid} autoRefresh={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};


	let		hinfo = null, sinfo = null;

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && data.parid && data.parid === parid) { 
			hinfo = (
				<>
				<div style={{ overflowX : 'auto', overflowWrap : 'anywhere', margin: 30, padding: 10, border: '1px groove #d9d9d9', maxHeight : 400 }} >
				<JSONDescription jsondata={data} fieldCols={hostinfofields} titlestr={`Host ${data.host} System Info`} 
							column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} />
				</div>
				</>
			);
		}
		else {
			hinfo = (<Alert type="warning" showIcon message="No Valid data found on server..." description=<Empty /> />);
			console.log(`Host Info Data Invalid seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		
		console.log(`Host Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
	}	
	else {
		hinfo = <LoadingAlert />;
	}

	if (addTabCB && remTabCB && isActiveTabCB) {
		sinfo = (
		<div style={{ marginTop: 30, marginBottom: 20 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={8}> {getHostMonitorLink()} </Col>
		<Col span={8}> {getCPUMemLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getServiceLink()} </Col>
		<Col span={8}> {getProcessLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getNetFlows()} </Col>

		</Row>

		</Space>
		</div>
		);
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		{sinfo}
		</ErrorBoundary>
		</>
	);
}	

export function HostInfoSearch({parid, useAggr, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey,
					dataObj, madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir})
{
	const 			[{ data, isloading, isapierror }, doFetch, fetchDispatch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {

		const	conf = {
			url 	: NodeApis.hostinfo,
			method	: 'post',
			data 	: {
				parid		: parid,
				qrytime		: Date.now(),
				timeoutsec 	: 100,
				timeoffsetsec	: useAggr ? 60 : undefined,
				madfilterarr	: madfilterarr,
				options		: {
					aggregate	: useAggr,
					aggroper	: aggrType,
					maxrecs 	: maxrecs,
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
				},	

			},
			timeout	: 100 * 1000,
		};

		const xfrmresp = (apidata) => {
			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, "hostinfo");
		};	

		try {
			if (safetypeof(dataObj) === 'array') {
				fetchDispatch({ type : 'fetch_success', payload : { hostinfo : dataObj} });
				return;
			}	
			
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch (error) {
			let			emsg;

			if ((typeof(error.response?.data) === 'object') || (typeof(error.response?.data) === 'string')) {
				emsg = getErrorString(error.response.data);
			}
			else if (error.message) {
				emsg = error.message;
			}	
			else {
				emsg = `Exception Caught while fetching data`;
			}	

			console.log(`Exception seen while fetching data : ${emsg}`);
	
			notification.error({message : "Data Fetch Error", description : `Exception during Host Info Data fetch : ${emsg}`});
		}

	}, [doFetch, fetchDispatch, dataObj, filter, maxrecs, aggrType, aggrfilter, parid, madfilterarr, useAggr, customColumns, customTableColumns, sortColumns, sortDir]);

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && Array.isArray(data.hostinfo)) { 
			
			if (data.hostinfo.length === 0) {
				hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
				closetab = 10000;
			}	
			else {
				if (typeof tableOnRow !== 'function') {
					if (!customTableColumns) {
						tableOnRow = (record, rowIndex) => {
							return {
								onClick: event => {
									Modal.info({
										title : <span><strong>Host {record.host} Info</strong></span>,
										content : (
											<HostInfoDesc parid={record.parid} hostInfoObj={record} 
													addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
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
										title : <span><strong>Host {record.host} Info</strong></span>,
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

				let			columns, rowKey, newtitlestr;

				if (customColumns && customTableColumns) {
					columns = customTableColumns;
					rowKey = "rowid";
					newtitlestr = "Host Info";
				}
				else {
					columns = hostInfoColumns;
					rowKey = "parid"; 

					newtitlestr = !filter && !name ? 'Global Hosts System Info' : !name ? 'Hosts System Info' : `${name} Hosts System Info`;

					if (useAggr) {
						newtitlestr = 'Aggregated ' + newtitlestr;
					}	
				}

				hinfo = (
					<>
					<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
					<Title level={4}>{titlestr ?? newtitlestr}</Title>
					<GyTable columns={columns} onRow={tableOnRow} dataSource={data.hostinfo} rowKey={rowKey} scroll={getTableScroll()}  />
					</div>
					</>
				);
			}
		}
		else {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
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

export function HostModalCard({rec, parid, modalCount, addTabCB, remTabCB, isActiveTabCB})
{
	const 		isTabletOrMobile = useMediaQuery({ maxWidth: 1224 });
	const		paridin = rec.parid ?? parid;

	const title = <em>{rec.host}<br /> at {rec.time}</em>;
	const statebadge = StateBadge(rec.state, rec.state);

	const getHostInfo = () => {

		const modonclick = () => {
			Modal.info({
				title : <span><strong>Host {rec.host} Info</strong></span>,
				content : (
					<>
					<ComponentLife stateCB={modalCount} />
					<HostInfoDesc parid={paridin} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
					</>
					),
				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
			});
		};	
		
		return <Button type='dashed' onClick={modonclick} >Host System Info</Button>;
	};

	const getHostHistory = () => {
		const		tstart = moment(rec.time, moment.ISO_8601).subtract(2, 'minute').format();
		const		tend = moment(rec.time, moment.ISO_8601).add(3, 'seconds').format();
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State around Record</i></span>, 'Host State History',
					() => { return <HostMonitor parid={paridin} isRealTime={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	

	const getCPUMemHistory = () => {
		const		tstart = moment(rec.time, moment.ISO_8601).subtract(2, 'minute').format();
		const		tend = moment(rec.time, moment.ISO_8601).add(3, 'seconds').format();
		const		tabKey = `CPU_Memory_${Date.now()}`;
		
		return CreateLinkTab(<span><i>CPU Memory State around Record </i></span>, 'CPU Memory State',
				() => { return <CPUMemPage parid={paridin} isRealTime={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
						/>}, tabKey, addTabCB);
	};
	
	const getServiceHistory = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Service Dashboard around Record</i></span>, 'Service Dashboard',
					() => { return <SvcDashboard parid={paridin} autoRefresh={false}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							starttime={rec.time} isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getProcessHistory = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Process Dashboard around Record </i></span>, 'Process Dashboard',
					() => { return <ProcDashboard parid={paridin} autoRefresh={false}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							starttime={rec.time} isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getNetFlowHistory = () => {
		const		tstart = moment(rec.time, moment.ISO_8601).subtract(2, 'minute').format();
		const		tend = moment(rec.time, moment.ISO_8601).add(15, 'seconds').format();
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow around Record</i></span>, 'Host Network Flow ', 
					() => { return <NetDashboard parid={paridin} autoRefresh={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};


	const getHostMonitorLink = () => {
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State Realtime</i></span>, 'Host State Monitor',
					() => { return <HostMonitor parid={paridin} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							/> }, tabKey, addTabCB);
	};
	

	const getCPUMemLink = () => {
		const		tabKey = `CPU_Memory_${Date.now()}`;
		
		return CreateLinkTab(<span><i>CPU Memory State Realtime</i></span>, 'CPU Memory Monitor',
				() => { return <CPUMemPage parid={paridin} isRealTime={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
						/>}, tabKey, addTabCB);
	};
	
	const getServiceLink = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Service Dashboard Realtime</i></span>, 'Host Service Dashboard',
					() => { return <SvcDashboard parid={paridin} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};
	
	const getProcessLink = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Process Dashboard Realtime</i></span>, 'Host Process Dashboard',
					() => { return <ProcDashboard parid={paridin} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
						 	/> }, tabKey, addTabCB);
	};

	const getNetFlowMonitor = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow Realtime</i></span>, 'Host Network Flow Monitor', 
					() => { return <NetDashboard parid={paridin} autoRefresh={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};

	const getSvcStateTable = (linktext, filter) => {
		const		tstartnew = moment(rec.time, moment.ISO_8601).subtract(9, 'seconds').format();
		const		tendnew = moment(rec.time, moment.ISO_8601).add(5, 'seconds').format();

		return <Button type='dashed' onClick={() => {
			svcTableTab({parid : paridin, hostname : rec.host, starttime : tstartnew, endtime : tendnew, filter, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter) => {
		const		tstartnew = moment(rec.time, moment.ISO_8601).subtract(9, 'seconds').format();
		const		tendnew = moment(rec.time, moment.ISO_8601).add(5, 'seconds').format();

		return <Button type='dashed' onClick={() => {
			procTableTab({parid : paridin, hostname : rec.host, starttime : tstartnew, endtime : tendnew, filter, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getCpumemStateTable = (linktext, filter) => {
		const		tstartnew = moment(rec.time, moment.ISO_8601).subtract(5, 'seconds').format();
		const		tendnew = moment(rec.time, moment.ISO_8601).add(5, 'seconds').format();

		return <Button type='dashed' onClick={() => {
			cpumemTableTab({parid : paridin, hostname : rec.host, starttime : tstartnew, endtime : tendnew, filter, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};



	return (
		<>
		<ErrorBoundary>

		<Descriptions title={title} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>

		<Descriptions.Item label={<em>Cluster Name</em>}>{rec.cluster}</Descriptions.Item>

		<Descriptions.Item label={<em>Host Partha ID</em>}><span style={{ fontSize: 12 }}>{paridin}</span></Descriptions.Item>
		
		<Descriptions.Item label={<em>Host Info</em>}>
			{getHostInfo()}
		</Descriptions.Item>
		
		<Descriptions.Item label={<em>Host State</em>}>
			<Space align='center'>
			{statebadge}
			</Space>
		</Descriptions.Item>

		<Descriptions.Item label={<em># Service Issues</em>}>
			{rec.nlistissue > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlistissue)}</span>, `{ state in 'Bad','Severe' }`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Severe Services</em>}>
			{rec.nlistsevere > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlistsevere)}</span>, `{ state = 'Severe' }`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Total Services</em>}>
			<Space align='center'>
			<span>{rec.nlisten}</span>
			</Space>
		</Descriptions.Item>

		<Descriptions.Item label={<em># Process Issues</em>}>
			{rec.nprocissue > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprocissue)}</span>, `{ state in 'Bad','Severe' }`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Severe Processes</em>}>
			{rec.nprocsevere > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprocsevere)}</span>, `{ state = 'Severe' }`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Host CPU Delays</em>}>
			{rec.cpudelms > 0 ? getProcStateTable(<span>{msecStrFormat(rec.cpudelms)}</span>, `{ cpudel > 0 }`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Host Memory Delays</em>}>
			{rec.vmdelms > 0 ? getProcStateTable(<span>{msecStrFormat(rec.vmdelms)}</span>, `{ vmdel > 0 }`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Disk IO Delays</em>}>
			{rec.iodelms > 0 ? getProcStateTable(<span>{msecStrFormat(rec.iodelms)}</span>, `{ iodel > 0 }`) : 0}
		</Descriptions.Item>

		{rec.cpuissue && <Descriptions.Item label={<em>Host CPU State</em>}>
			{getCpumemStateTable(StateBadge(rec.severecpu ? 'Severe' : 'Bad'), `{ cpumem.cpu_state in 'Bad','Severe' }`)}
		</Descriptions.Item>}
		
		{rec.memissue && <Descriptions.Item label={<em>Host Memory State</em>}>
			{getCpumemStateTable(StateBadge(rec.severemem ? 'Severe' : 'Bad'), `{ cpumem.mem_state in 'Bad','Severe' }`)}
		</Descriptions.Item>}

		<Descriptions.Item label={<em># Total Grouped Processes</em>}>
			<Space align='center'>
			<span>{rec.nproc}</span>
			</Space>
		</Descriptions.Item>
		

		<Descriptions.Item label={<em>Complete Record</em>}>{ButtonJSONDescribe({record : rec, fieldCols : hoststatefields})}</Descriptions.Item>

		</Descriptions>


		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={8}> {getHostInfo()} </Col>

		</Row>


		<Row justify="space-between">

		<Col span={8}> {getHostHistory()} </Col>
		<Col span={8}> {getHostMonitorLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getServiceHistory()} </Col>
		<Col span={8}> {getServiceLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getProcessHistory()} </Col>
		<Col span={8}> {getProcessLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getCPUMemHistory()} </Col>
		<Col span={8}> {getCPUMemLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getNetFlowHistory()} </Col>
		<Col span={8}> {getNetFlowMonitor()} </Col>

		</Row>

		</Space>
		</div>

		</ErrorBoundary>

		</>
	);		
}

export function HostSummary({normdata, onRow, modalCount, addTabCB, remTabCB, isActiveTabCB })
{
	const 		summary = normdata.summary;
	const 		isTabletOrMobile = useMediaQuery({ maxWidth: 1224 });

	const createLinkModal = (linktext, desc, filt) => {

		const modonclick = () => {
			/*
			 * Using filtered array as prefilters in Ant Table are not reset on Modal close for filteredValue set
			 */
			Modal.info({
				title : typeof filt === 'function' ? 
					<div style={{ textAlign : 'center' }}>{<em>{desc} <br /> 
					<Space><span 
						style={{ fontSize : 14, visibility : (false === moment(normdata.starttime, moment.ISO_8601).isValid()) ? "hidden" : "visible" }} > 
						at time {normdata.starttime} ({moment(normdata.starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss.SSS Z")})</span></Space>
					</em>} </div> :
					<span>{desc} retrieval not currently implemented...</span>,

				content : (
					<>
					<ComponentLife stateCB={modalCount} />
					{typeof filt === 'function' ?
					<GyTable columns={hostColumns(true)} modalCount={modalCount} onRow={onRow} dataSource={normdata.hoststate.filter(filt)} rowKey="parid" scroll={getTableScroll()} /> :
					null}
					</>
					),
				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
			});
		};	
		
		return <Button type='dashed' onClick={modonclick} >{linktext}</Button>;
	};
	
	const title = (<div style={{ textAlign : 'center', marginBottom : 20 }}>
		{<><Title level={4}>Host Summary</Title><em> 
		<Space>
		<span 
			style={{ fontSize : 14, visibility : (false === moment(normdata.starttime, moment.ISO_8601).isValid()) ? "hidden" : "visible" }} > 
			at {normdata.starttime} ({moment(normdata.starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss.SSS Z")}) </span>
		</Space>
		</em></>} 
		</div>);

	const statestr = (<><Space size={isTabletOrMobile ? 'small' : 'large'}>
				{!isTabletOrMobile && StateBadge('Idle', 
					createLinkModal(`${summary.nhosts_idle} Idle`, 'Idle Hosts', (item) => item.state === 'Idle'))} 	
				{!isTabletOrMobile && StateBadge('Good', 
					createLinkModal(`${summary.nhosts_good} Good`, 'Good Hosts', (item) => item.state === 'Good'))} 	
				{!isTabletOrMobile && StateBadge('OK', 
					createLinkModal(`${summary.nhosts_ok} OK`, 'OK Hosts', (item) => item.state === 'OK'))} 	
				{StateBadge('Bad', 
					createLinkModal(`${summary.nhosts_bad} Bad`, 'Bad Hosts', (item) => item.state === 'Bad'))} 	
				{StateBadge('Severe', 
					createLinkModal(`${summary.nhosts_severe} Severe`, 'Severe Hosts', (item) => item.state === 'Severe'))} 	
			</Space></>);

	return (
		<Descriptions title={title} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em># Active Hosts</em>}>
				<Statistic valueStyle={{ fontSize: 14 }} value={summary.nhosts} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Monitored </em>}>
				<Statistic valueStyle={{ fontSize: 14 }} value={summary.ntotal_hosts} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Offline Hosts</em>}>
				<Statistic valueStyle={{ fontSize: 14 }} value={summary.nhosts_offline} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Host Status</em>} 
				span={2}>{statestr}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with CPU Issues</em>}>
				{summary.ncpuissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.ncpuissue_hosts} />, 
					'CPU Issues', (item) => item.cpuissue === true) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Memory Issues</em>}>
				{summary.nmemissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nmemissue_hosts} />,
					'Memory Issues', (item) => item.memissue === true) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Services Issues</em>}>
				{summary.nlistissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14 }} value={summary.nlistissue_hosts} />,
					'Services Issues', (item) => item.nlistissue > 0) : 0}
			</Descriptions.Item>
			
			<Descriptions.Item 
				label={<em># Hosts with Process Issues</em>}>
				{summary.nprocissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nprocissue_hosts} />,
					'Process Issues', (item) => item.nprocissue > 0) : 0}
			</Descriptions.Item>
			
			<Descriptions.Item 
				label={<em># Hosts with CPU Delays</em>}>
				{summary.ncpudelms_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14 }} value={summary.ncpudelms_hosts} />,
					'CPU Delay Hosts', (item) => item.cpudelms > 0) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Memory Delays</em>}>
				{summary.nvmdelms_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nvmdelms_hosts} />,
					'Memory Delay Hosts', (item) => item.vmdelms > 0) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with IO Delays</em>}>
				{summary.niodelms_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14 }} value={summary.niodelms_hosts} />,
					'IO Delay Hosts', (item) => item.iodelms > 0) : 0}
			</Descriptions.Item>


			<Descriptions.Item 
				label={<em># Total Services</em>}>
				{format(",")(summary.nlisten)}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Service Issues</em>}>
				{summary.nlisten_issue > 0 ? <Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nlisten_issue} /> : 0}
			</Descriptions.Item>
			
			<Descriptions.Item 
				label={<em># Severe Service Issues</em>}>
				{summary.nlisten_severe > 0 ? <Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nlisten_severe} /> : 0}
			</Descriptions.Item>
		</Descriptions>
	);		
}	

export function HostRangeCard({rec, parid, starttime, endtime, addTabCB, remTabCB, isActiveTabCB})
{
	const 		isTabletOrMobile = useMediaQuery({ maxWidth: 1224 });
	const		paridin = rec.parid ?? parid;
	let		useAggr = (rec.inrecs !== undefined), aggregatesec, startmom, endmom;

	const		nlistissue = (rec.detailissues !== undefined ? rec.listissue : rec.nlistissue);
	const		nlistsevere = (rec.detailissues !== undefined ? rec.listsevere : rec.nlistsevere);
	const		nprocissue = (rec.detailissues !== undefined ? rec.procissue : rec.nprocissue);
	const		nprocsevere = (rec.detailissues !== undefined ? rec.procsevere : rec.nprocsevere);

	startmom = moment(starttime, moment.ISO_8601); 
	endmom = moment(endtime, moment.ISO_8601);

	if (endmom.unix() >= startmom.unix() + 2 * 3600) {
		aggregatesec = 60;
	}	

	const title = <em>{rec.host}<br /> for time range {starttime} to {endtime}</em>;

	const getHostInfo = () => {

		const modonclick = () => {
			Modal.info({
				title : <span><strong>Host {rec.host} Info</strong></span>,
				content : <HostInfoDesc parid={paridin} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
			});
		};	
		
		return <Button type='dashed' onClick={modonclick} >Host System Info</Button>;
	};

	const getHostHistory = () => {
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State around Record</i></span>, 'Host State History',
					() => { return <HostMonitor parid={paridin} isRealTime={false} starttime={starttime} endtime={endtime} 
							aggregatesec={aggregatesec}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getCPUMemHistory = () => {
		const		tabKey = `CPU_Memory_${Date.now()}`;
		
		return CreateLinkTab(<span><i>CPU Memory State around Record</i></span>, 'CPU Memory History',
				() => { return <CPUMemPage parid={paridin} isRealTime={false} starttime={starttime} endtime={endtime} 
							aggregatesec={aggregatesec}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
						/>}, tabKey, addTabCB);
	};
	
	const getServiceHistory = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Service Dashboard around Record</i></span>, 'Service Dashboard',
					() => { return <SvcDashboard parid={paridin} autoRefresh={false}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							starttime={starttime} endtime={endtime} isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getProcessHistory = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Process Dashboard around Record</i></span>, 'Process Dashboard',
					() => { return <ProcDashboard parid={paridin} autoRefresh={false}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							starttime={starttime} endtime={endtime} isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getNetFlowHistory = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow around Record</i></span>, 'Host Network Flow ', 
					() => { return <NetDashboard parid={paridin} autoRefresh={false} starttime={starttime} endtime={endtime} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};


	const getHostMonitorLink = () => {
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State Realtime</i></span>, 'Host State Monitor',
					() => { return <HostMonitor parid={paridin} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							/> }, tabKey, addTabCB);
	};
	

	const getCPUMemLink = () => {
		const		tabKey = `CPU_Memory_${Date.now()}`;
		
		return CreateLinkTab(<span><i>CPU Memory State Realtime</i></span>, 'CPU Memory Monitor',
				() => { return <CPUMemPage parid={paridin} isRealTime={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
						/>}, tabKey, addTabCB);
	};
	
	const getServiceLink = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Service Dashboard Realtime</i></span>, 'Host Service Dashboard',
					() => { return <SvcDashboard parid={paridin} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};
	
	const getProcessLink = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Process Dashboard Realtime</i></span>, 'Host Process Dashboard',
					() => { return <ProcDashboard parid={paridin} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
						 	/> }, tabKey, addTabCB);
	};

	const getNetFlowMonitor = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow Realtime</i></span>, 'Host Network Flow Monitor', 
					() => { return <NetDashboard parid={paridin} autoRefresh={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};

	const getSvcStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			svcTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, useAggr : true, aggrMin : 30 * 60 * 24, aggrType : 'sum',
							maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, useAggr : true, aggrMin : 30 * 60 * 24, aggrType : 'sum',
							maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getCpumemStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			cpumemTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, useAggr : true, aggrMin : 30 * 60 * 24, aggrType : 'sum',
							maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	return (
		<>
		<ErrorBoundary>

		<Descriptions title={title} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>

		<Descriptions.Item label={<em>Cluster Name</em>}>{rec.cluster}</Descriptions.Item>
		
		<Descriptions.Item label={<em>Host Info</em>}>
			{getHostInfo()}
		</Descriptions.Item>
		
		{rec.detailissues !== undefined && <Descriptions.Item label={<em># Bad States</em>}>
			<Space align='center'>
			<>
			<span style={{ color: rec.detailissues > 0 ? 'red' : 'green'}}>{rec.detailissues}</span>
			<span> of {rec.detailrecs} records</span>
			</>
			</Space>
		</Descriptions.Item>}

		{useAggr && rec.recs &&
		<Descriptions.Item label={<em># Aggregated Bad States</em>}>
			<Space align='center'>
			<span style={{ color: rec.badstate > 0 ? 'red' : 'green'}}>{rec.badstate}</span>
			<span> of {rec.recs.length} records</span>
			</Space>
		</Descriptions.Item>
		}

		<Descriptions.Item label={<em># Service Issues</em>}>
			{nlistissue > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(nlistissue)}</span>, `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Severe Service Issues</em>}>
			{nlistsevere > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(nlistsevere)}</span>, `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Process Issues</em>}>
			{nprocissue > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(nprocissue)}</span>, `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Severe Process Issues</em>}>
			{nprocsevere > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(nprocsevere)}</span>, `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Host CPU Issues</em>}>
			{rec.cpuissue > 0 ? getCpumemStateTable(<span style={{ color : 'red' }}>{format(",")(rec.cpuissue)}</span>, `({ cpumem.cpu_state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Host Memory Issues</em>}>
			{rec.memissue > 0 ? getCpumemStateTable(<span style={{ color : 'red' }}>{format(",")(rec.memissue)}</span>, `({ cpumem.mem_state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		{rec.cpudelms >= 0 &&
		<Descriptions.Item label={<em>Host CPU Delays</em>}>
			{rec.cpudelms > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{msecStrFormat(rec.cpudelms)}</span>, `{ cpudel > 0 }`) : 0}
		</Descriptions.Item>
		}

		{rec.vmdelms >= 0 &&
		<Descriptions.Item label={<em>Host Memory Delays</em>}>
			{rec.vmdelms > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{msecStrFormat(rec.vmdelms)}</span>, `{ vmdel > 0 }`) : 0}
		</Descriptions.Item>
		}

		{rec.iodelms >= 0 &&
		<Descriptions.Item label={<em>Disk IO Delays</em>}>
			{rec.iodelms > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{msecStrFormat(rec.iodelms)}</span>, `{ iodel > 0 }`) : 0}
		</Descriptions.Item>
		}


		</Descriptions>


		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={8}> {getHostInfo()} </Col>

		</Row>


		<Row justify="space-between">

		<Col span={8}> {getHostHistory()} </Col>
		<Col span={8}> {getHostMonitorLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getServiceHistory()} </Col>
		<Col span={8}> {getServiceLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getProcessHistory()} </Col>
		<Col span={8}> {getProcessLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getCPUMemHistory()} </Col>
		<Col span={8}> {getCPUMemLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getNetFlowHistory()} </Col>
		<Col span={8}> {getNetFlowMonitor()} </Col>

		</Row>

		</Space>
		</div>

		</ErrorBoundary>

		</>

	);		
}

// Specify starttime if rec.time is to be ignored. Also endtime should be specified in case no step aggregation is on
export function HostRangeAggrTimeCard({rec, parid, starttime, endtime, aggrMin, aggrType, addTabCB, remTabCB, isActiveTabCB})
{
	const 		isTabletOrMobile = useMediaQuery({ maxWidth: 1224 });
	const		paridin = rec.parid ?? parid;
	let		aggregatesec, startmom, endmom, aggrtypestr = aggrType ? capitalFirstLetter(aggrType) : '';

	if (!aggrMin || aggrMin < 0) {
		aggrMin = 5;
	}

	startmom = moment(starttime ?? rec.time, moment.ISO_8601); 

	const				rt = moment(rec.time, moment.ISO_8601).add(aggrMin, 'minutes');

	if (endtime) {
		const				em = moment(endtime, moment.ISO_8601);
		
		if (+em < +rt) {
			endmom = em;
		}	
		else {
			endmom = rt;
		}	
	}	
	else {
		endmom = rt;
	}

	starttime = startmom.format();

	endtime = endmom.format();

	if (endmom.unix() >= startmom.unix() + 2 * 3600) {
		aggregatesec = 60;
	}	

	const title = <em>{rec.host}<br /> for time range {starttime} to {endtime}</em>;

	const getHostInfo = () => {

		const modonclick = () => {
			Modal.info({
				title : <span><strong>Host {rec.host} Info</strong></span>,
				content : <HostInfoDesc parid={paridin} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
			});
		};	
		
		return <Button type='dashed' onClick={modonclick} >Host System Info</Button>;
	};

	const getHostHistory = () => {
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State around Record</i></span>, 'Host State History',
					() => { return <HostMonitor parid={paridin} isRealTime={false} starttime={starttime} endtime={endtime} 
							aggregatesec={aggregatesec}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getCPUMemHistory = () => {
		const		tabKey = `CPU_Memory_${Date.now()}`;
		
		return CreateLinkTab(<span><i>CPU Memory State around Record</i></span>, 'CPU Memory History',
				() => { return <CPUMemPage parid={paridin} isRealTime={false} starttime={starttime} endtime={endtime} 
							aggregatesec={aggregatesec}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
						/>}, tabKey, addTabCB);
	};
	
	const getServiceHistory = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Service Dashboard around Record</i></span>, 'Host Service Dashboard',
					() => { return <SvcDashboard parid={paridin} autoRefresh={false}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							starttime={starttime} endtime={endtime} isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getProcessHistory = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Process Dashboard around Record</i></span>, 'Host Process Dashboard',
					() => { return <ProcDashboard parid={paridin} autoRefresh={false}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							starttime={starttime} endtime={endtime} isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getNetFlowHistory = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow around Record</i></span>, 'Host Network Flow ', 
					() => { return <NetDashboard parid={paridin} autoRefresh={false} starttime={starttime} endtime={endtime} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};


	const getHostMonitorLink = () => {
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State Realtime</i></span>, 'Host State Monitor',
					() => { return <HostMonitor parid={paridin} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							/> }, tabKey, addTabCB);
	};
	

	const getCPUMemLink = () => {
		const		tabKey = `CPU_Memory_${Date.now()}`;
		
		return CreateLinkTab(<span><i>CPU Memory State Realtime</i></span>, 'CPU Memory Monitor',
				() => { return <CPUMemPage parid={paridin} isRealTime={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
						/>}, tabKey, addTabCB);
	};
	
	const getServiceLink = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Service Dashboard Realtime</i></span>, 'Host Service Dashboard',
					() => { return <SvcDashboard parid={paridin} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};
	
	const getProcessLink = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Process Dashboard Realtime</i></span>, 'Host Process Dashboard',
					() => { return <ProcDashboard parid={paridin} autoRefresh={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
						 	/> }, tabKey, addTabCB);
	};

	const getNetFlowMonitor = () => {
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow Realtime</i></span>, 'Host Network Flow Monitor', 
					() => { return <NetDashboard parid={paridin} autoRefresh={true} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};

	const getSvcStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			svcTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, useAggr : true, aggrMin : 30 * 60 * 24, aggrType : 'sum',
							maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, useAggr : true, aggrMin : 30 * 60 * 24, aggrType : 'sum',
							maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getCpumemStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			cpumemTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, useAggr : true, aggrMin : 30 * 60 * 24, aggrType : 'sum',
							maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	return (
		<>
		<ErrorBoundary>

		<Descriptions title={title} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>

		<Descriptions.Item label={<em>Cluster Name</em>}>{rec.cluster}</Descriptions.Item>
		
		<Descriptions.Item label={<em>Host Info</em>}>
			{getHostInfo()}
		</Descriptions.Item>
		
		{rec.inrecs !== undefined && <Descriptions.Item label={<em># Bad States</em>}>
			<Space align='center'>
			<>
			<span style={{ color: rec.issue > 0 ? 'red' : 'green'}}>{rec.issue}</span>
			<span> of {rec.inrecs} records</span>
			</>
			</Space>
		</Descriptions.Item>}


		<Descriptions.Item label={<em>{aggrtypestr} Aggr Service Issues</em>}>
			{rec.nlistissue > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlistissue)}</span>, `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>{aggrtypestr} Aggr Severe Service Issues</em>}>
			{rec.nlistsevere > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlistsevere)}</span>, `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Total Services</em>}>
			<Space align='center'>
			<span>{format(",")(rec.nlisten)}</span>
			</Space>
		</Descriptions.Item>


		<Descriptions.Item label={<em>{aggrtypestr} Aggr Process Issues</em>}>
			{rec.nprocissue > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprocissue)}</span>, `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>{aggrtypestr} Aggr Severe Process Issues</em>}>
			{rec.nprocsevere > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprocsevere)}</span>, `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Grouped Processes </em>}>
			<Space align='center'>
			<span>{format(",")(rec.nproc)}</span>
			</Space>
		</Descriptions.Item>

		<Descriptions.Item label={<em>{aggrtypestr} Aggr Host CPU Issues</em>}>
			{rec.cpuissue > 0 ? getCpumemStateTable(<span style={{ color : 'red' }}>{format(",")(rec.cpuissue)}</span>, `({ cpumem.cpu_state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>{aggrtypestr} Aggr Host Memory Issues</em>}>
			{rec.memissue > 0 ? getCpumemStateTable(<span style={{ color : 'red' }}>{format(",")(rec.memissue)}</span>, `({ cpumem.mem_state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		{rec.cpudelms >= 0 &&
		<Descriptions.Item label={<em>{aggrtypestr} Aggr CPU Delays</em>}>
			{rec.cpudelms > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{msecStrFormat(rec.cpudelms)}</span>, `{ cpudel > 0 }`) : 0}
		</Descriptions.Item>
		}

		{rec.vmdelms >= 0 &&
		<Descriptions.Item label={<em>{aggrtypestr} Aggr Memory Delays</em>}>
			{rec.vmdelms > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{msecStrFormat(rec.vmdelms)}</span>, `{ vmdel > 0 }`) : 0}
		</Descriptions.Item>
		}

		{rec.iodelms >= 0 &&
		<Descriptions.Item label={<em>{aggrtypestr} Aggr IO Delays</em>}>
			{rec.iodelms > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{msecStrFormat(rec.iodelms)}</span>, `{ iodel > 0 }`) : 0}
		</Descriptions.Item>
		}


		</Descriptions>

		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={8}> {getHostInfo()} </Col>

		</Row>


		<Row justify="space-between">

		<Col span={8}> {getHostHistory()} </Col>
		<Col span={8}> {getHostMonitorLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getServiceHistory()} </Col>
		<Col span={8}> {getServiceLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getProcessHistory()} </Col>
		<Col span={8}> {getProcessLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getCPUMemHistory()} </Col>
		<Col span={8}> {getCPUMemLink()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getNetFlowHistory()} </Col>
		<Col span={8}> {getNetFlowMonitor()} </Col>

		</Row>

		</Space>
		</div>

		</ErrorBoundary>

		</>

	);		
}

export function HostRangeSummary({normdata, aggrType, onRow, modalCount, addTabCB, remTabCB, isActiveTabCB })
{
	const 		summary = normdata.summary;

	const createLinkModal = (linktext, desc, filt) => {

		const modonclick = () => {
			/*
			 * Using filtered array as prefilters in Ant Table are not reset on Modal close for filteredValue set
			 */
			Modal.info({
				title : typeof filt === 'function' ? 
					<div style={{ textAlign : 'center' }}>{<em>{desc}</em> }</div> :
					<span>{desc} retrieval not currently implemented...</span>,

				content : (
					<>
					<ComponentLife stateCB={modalCount} />
					{typeof filt === 'function' ?
					<GyTable columns={hostRangeColumns(aggrType)} modalCount={modalCount} onRow={onRow} dataSource={normdata.hoststate.filter(filt)} 
									rowKey="parid"  scroll={getTableScroll()} /> :
					null}
					</>
					),

				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
			});
		};	
		
		return <Button type='dashed' onClick={modonclick} >{linktext}</Button>;
	};
	
	const title = (<div style={{ textAlign : 'center' }}>
		{<>
		<Title level={4}>{normdata.isaggr ? `Aggregated ` : ''} Host Summary</Title>
		<em><span style={{ fontSize : 14 }} > for time range {normdata.starttime} to {normdata.endtime} </span> </em>
		</>} 
		</div>);

	return (
		<Descriptions title={title} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em># Active Hosts</em>}>
				<Statistic valueStyle={{ fontSize: 14 }} value={summary.nhosts} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Issues</em>}> 
				{summary.nhosts_badstate > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nhosts_badstate} />, 
					'Host Issues', (item) => item.badstate > 0) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with CPU Issues</em>}>
				{summary.ncpuissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.ncpuissue_hosts} />, 
					'CPU Issues', (item) => item.cpuissue > 0) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Memory Issues</em>}>
				{summary.nmemissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nmemissue_hosts} />,
					'Memory Issues', (item) => item.memissue > 0) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Services Issues</em>}>
				{summary.nlistissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nlistissue_hosts} />,
					'Services Issues', (item) => item.listissue > 0) : 0}
			</Descriptions.Item>
			
			<Descriptions.Item 
				label={<em># Hosts with Process Issues</em>}>
				{summary.nprocissue_hosts > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nprocissue_hosts} />,
					'Process Issues', (item) => item.procissue > 0) : 0}
			</Descriptions.Item>
			
		</Descriptions>

	);		
}	

export function HostStateQuickFilters({filterCB, useHostFields})
{
	if (typeof filterCB !== 'function') return null;

	const onHost = (value) => {
		filterCB(`{ host like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onCluster = (value) => {
		filterCB(`{ host.cluster like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onBadhost = () => {
		filterCB(`{ hoststate.state in 'Bad','Severe' }`);
	};	

	const onSvcIssue = () => {
		filterCB(`{ hoststate.nlistissue > 0 }`);
	};	

	const onProcIssue = () => {
		filterCB(`{ hoststate.nprocissue > 0 }`);
	};	

	const onCPUIssue = () => {
		filterCB(`{ hoststate.cpuissue = true }`);
	};	

	const onMemIssue = () => {
		filterCB(`{ hoststate.memissue = true }`);
	};	

	return (
	<>	
	{useHostFields === true && 
		<>
		<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
		<div>
		<span style={{ fontSize : 14 }}><i><strong>Hostname Like </strong></i></span>
		</div>

		<div>
		<Search placeholder="Regex like" allowClear onSearch={onHost} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
		</div>

		</div>
		</>}

	{useHostFields === true && 
		<>
		<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
		<div>
		<span style={{ fontSize : 14 }}><i><strong>Cluster Name Like </strong></i></span>
		</div>

		<div>
		<Search placeholder="Regex like" allowClear onSearch={onCluster} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
		</div>

		</div>
		</>}

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host State is Bad or Severe </strong></i></span>
	</div>

	<div style={{ width : 270, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onBadhost} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has Service Issues </strong></i></span>
	</div>

	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onSvcIssue} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has Process Issues </strong></i></span>
	</div>

	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onProcIssue} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has CPU Issues </strong></i></span>
	</div>

	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onCPUIssue} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has Memory Issues </strong></i></span>
	</div>

	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onMemIssue} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	</>
	);
}	

export function HostStateMultiQuickFilter({filterCB, useHostFields = true, linktext, quicklinktext})
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
			title : <Title level={4}>Host State Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={hoststatefields} useHostFields={useHostFields} title='Host State Advanced Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields]);	

	const quickfilter = useCallback(() => {
		objref.current.modal = Modal.info({
			title : <Title level={4}>Host State Quick Filters</Title>,

			content : <HostStateQuickFilters filterCB={onFilterCB} useHostFields={useHostFields} />,
			width : 850,	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB, useHostFields]);

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

export function HostStateAggrFilter({filterCB, linktext})
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
			title : <Title level={4}>Host State Aggregation Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={aggrhoststatefields} title='Host State Aggregation Filters' />,
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

export function HostInfoFilters({filterCB, linktext})
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
			title : <Title level={4}>Host System Info Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={hostinfofields} title='Host System Info Filters' />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return <Button onClick={multifilters}>{linktext ?? "Host System Info Filters"}</Button>;	
}

export function HostStateSearch({parid, starttime, endtime, useAggr, aggrMin, aggrType, filter, tableOnRow, aggrfilter, maxrecs, name, addTabCB, remTabCB, isActiveTabCB, tabKey,
					dataObj, madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch, fetchDispatch] = useFetchApi(null);
	const			isrange = (starttime !== undefined && endtime !== undefined) ? true : false;
	let			hinfo = null, closetab = 0;

	useEffect(() => {

		const			isrange = (starttime && endtime);

		const	conf = {
			url 	: NodeApis.hoststate,
			method	: 'post',
			data 	: {
				parid		: parid,
				qrytime		: Date.now(),
				timeoutsec 	: 100,
				starttime 	: starttime,
				endtime 	: endtime,
				madfilterarr	: madfilterarr,
				options		: {
					aggregate	: isrange && useAggr,
					aggroper	: aggrType,
					aggrsec		: useAggr && aggrMin > 0 ? aggrMin * 60 : undefined,
					maxrecs 	: maxrecs,
					filter		: filter,
					aggrfilter	: useAggr ? aggrfilter : undefined,
					columns		: customColumns && customTableColumns ? customColumns : undefined,
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
					recoffset       : recoffset > 0 ? recoffset : undefined,
				},	

			},
			timeout	: 100 * 1000,
		};

		const xfrmresp = (apidata) => {
			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, "hoststate");
		};	

		try {
			if (safetypeof(dataObj) === 'array') {
				fetchDispatch({ type : 'fetch_success', payload : { hoststate : dataObj} });
				return;
			}	
			
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 
		catch (error) {
			let			emsg;

			if ((typeof(error.response?.data) === 'object') || (typeof(error.response?.data) === 'string')) {
				emsg = getErrorString(error.response.data);
			}
			else if (error.message) {
				emsg = error.message;
			}	
			else {
				emsg = `Exception Caught while fetching data`;
			}	

			console.log(`Exception seen while fetching data : ${emsg}`);
	
			notification.error({message : "Data Fetch Error", description : `Exception during Host State Data fetch : ${emsg}`});
		}

	}, [parid, aggrMin, aggrType, doFetch, fetchDispatch, dataObj, endtime, madfilterarr, filter, aggrfilter, maxrecs, starttime, 
				useAggr, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					dataRowsCb(data.hoststate?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, dataRowsCb]);	

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && Array.isArray(data.hoststate)) { 
			
			if (data.hoststate.length === 0) {
				hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
				closetab = 10000;
			}	
			else {
				if (!tableOnRow) {
					if (!customTableColumns) {
						tableOnRow = (record, rowIndex) => {
							return {
								onClick: event => {
									Modal.info({
										title : <span><strong>Host {record.host}</strong></span>,
										content : (
											<>
											{(!isrange || !useAggr) && <HostModalCard rec={record} parid={parid} addTabCB={addTabCB} 
															remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}
											{isrange && useAggr && !aggrMin && <HostRangeCard rec={record} parid={parid} starttime={starttime} endtime={endtime}
															addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}
											{isrange && (useAggr && aggrMin) && 
															<HostRangeAggrTimeCard rec={record} parid={parid} aggrMin={aggrMin}
																aggrType={aggrType} endtime={endtime}
																addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}
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
										title : <span><strong>Host {record.host} State</strong></span>,
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

				let			columns, rowKey, newtitlestr, timestr;

				if (customColumns && customTableColumns) {
					columns = customTableColumns;
					rowKey = "rowid";
					newtitlestr = "Host State";
					timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
				}	
				else if (!isrange) {
					columns = hostColumns(!parid);
					rowKey = !parid ? 'parid' : 'time';

					newtitlestr = name ? `${name} Host State` : !filter && !parid ? 'Global Host State' : 'Host State';
					timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format("MMM Do YYYY HH:mm:ss Z")} </span>;
				}
				else {
					rowKey = ((record) => record.time + record.parid);

					newtitlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : ''} Host State`;
					columns = !useAggr ? hostTimeColumns(!parid) : (aggrMin ? hostRangeTimeColumns(aggrType, !parid) : hostRangeNoSummColumns(aggrType, !parid));
					timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;
				}	

				hinfo = (
					<>
					<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
					<Title level={4}>{titlestr ?? newtitlestr}</Title>
					{timestr}
					<div style={{ marginBottom: 30 }} />
					<GyTable columns={columns} onRow={tableOnRow} dataSource={data.hoststate} rowKey={rowKey} scroll={getTableScroll()} />
					</div>
					</>
				);
			}
		}
		else {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
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

export function hostTableTab({parid, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, maxrecs, name, tableOnRow, addTabCB, remTabCB, isActiveTabCB, 
					modal, title = 'Host States', dataObj,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Host State Query", description : `Invalid starttime specified for Host State : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Host State Query", description : `Invalid endtime specified for Host State : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Host State Query", description : `Invalid endtime specified for Host State : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? HostStateSearch;
	let				tabKey;
	
	const getComp = () => { return (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<Comp parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} 
					dataObj={dataObj} madfilterarr={madfilterarr} titlestr={titlestr} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={HostStateSearch} /> 
				</>
				) 
			};

	if (!modal) {
		tabKey = `HostState_${Date.now()}`;

		CreateTab(title ?? "Host State", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Host State",

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

export function hostinfoTableTab({parid, useAggr, aggrType, filter, aggrfilter, maxrecs, name, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title = 'Host Info',
					dataObj, madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, extraComp = null})
{
	let				tabKey;

	const getComp = () => { return (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<HostInfoSearch parid={parid} useAggr={useAggr} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} dataObj={dataObj}
					madfilterarr={madfilterarr} titlestr={titlestr} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} /> 
				</>
				);
			};

	if (!modal) {
		tabKey = `HostInfo_${Date.now()}`;

		CreateTab(title ?? "Host Info", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Host Info",

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

export function HostDashboard({autoRefresh, refreshSec, starttime, endtime, aggrType, filter, maxrecs, name, addTabCB, remTabCB, isActiveTabCB, tabKey})
{
	const		objref = useRef();

	const 		[isAutoRefresh, setAutoRefresh] = useState(autoRefresh ?? (starttime && endtime ? false : true));
	const 		[currRefreshSec, ] = useState(isAutoRefresh && refreshSec >= 5 ? refreshSec : 15);
	const		[filterStr, setFilterStr] = useState();
	const		[, setTimeSlider] = useState();
	const		[, setPauseRefresh] = useState();
	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});

	if (!objref.current) {
		objref.current = {
			prevdata		: null,
			prevbodycont		: null,
			panearr			: [],
			activekey 		: '',
			pauseRefresh		: false,
			filterset		: false,
			modalCount		: 0,
			isrange			: false,
			timeSliderIndex		: null,
			sliderTimer		: null,
			datahistarr		: [],
		};	
	}

	useEffect(() => {
		console.log(`Host Dashboard initial Effect called...`);

		return () => {
			console.log(`Host Dashboard destructor called...`);
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

				if (mend.unix() >= mstart.unix() + 10) {
					objref.current.isrange = true;
				}
			}	

		}
		else if (!autoRefresh && !starttime) {
			throw new Error(`autoRefresh disabled but no starttime specified`);
		}	

		if (filter && ((false === filter.includes('host')) && (false === filter.includes('cluster')) && (false === filter.includes('parid')))) {
			throw new Error(`Invalid filter prop specified : Only Host Filters allowed`);
		}

		if (maxrecs && (!(maxrecs > 1 && maxrecs < 1000000))) {
			throw new Error(`Invalid maxrecs prop specified : Only numbers between 1 and 1 million allowed`);
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

	}, [objref, starttime, endtime, filter, maxrecs, autoRefresh, addTabCB, remTabCB, isActiveTabCB, tabKey]);	

	if (validProps === false) {
		throw new Error(`Internal Error : Host Dashboard validProps check failed`);
	}	

	const modalCount = useCallback((isup) => {
		/*console.log(`modalCount CB called with param ${isup} : Current modalCount = ${objref.current.modalCount}`);*/

		if (isup === true) {
			objref.current.modalCount++;
		}	
		else if (isup === false && objref.current.modalCount > 0) {
			objref.current.modalCount--;
		}	
	}, [objref]);	

	const tableOnRow = useCallback((record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Host {record.host}</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						{!objref.current.isrange && <HostModalCard rec={record} modalCount={modalCount} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}
						{objref.current.isrange && <HostRangeCard rec={record} starttime={starttime} endtime={endtime}
										modalCount={modalCount} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}
						</>
						),
					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
				});
			}
		};		
	}, [objref, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, modalCount]);	

	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 10) => {
		objref.current.filterset	= filterStr && filterStr.length > 0;

		let			fstr;

		if (filter) {
			if (filterStr) {
				fstr = `( ${filter} and ${filterStr} )`; 
			}	
			else {
				fstr = filter;
			}	
		}	
		else {
			fstr = filterStr;
		}	

		return {
			url 	: NodeApis.hoststate,
			method	: 'post',
			data 	: {
				qrytime		: Date.now(),
				timeoutsec 	: timeoutsec,
				filter 		: fstr,

				...fetchparams,
			},
			timeout	: timeoutsec * 1000,
		};
	}, [objref, filter, filterStr]);

	const fetchData = useCallback(async () => {
		try {
			const			isaggr = (objref.current.isrange === true);

			const econf = { 
				starttime 	: starttime,
				endtime 	: endtime,
				options		: {
					aggregate	: isaggr,
					aggroper	: aggrType,
					maxrecs		: maxrecs,
				}	
			};

			const			conf = getaxiosconf(econf, isaggr ? 100 : 10);

			console.log(`Fetching Host Dashboard for config ${JSON.stringify(conf)}`);

			setApiData({data : [], isloading : true, isapierror : false});

			let 			res = await axios(conf);

			validateApi(res.data);

			if (safetypeof(res.data) === 'array') { 
				let			ndata;

				if (!objref.current.isrange || !isaggr) {
					ndata = getNormParthaHostState(res.data);

					fixedArrayAddItems([ndata], objref.current.datahistarr, 5);
				}
				else {
					ndata = getNormParthaHostRange(res.data, starttime, endtime, isaggr);
				}	

				setApiData({data : ndata, isloading : false, isapierror : false});
			}
			else {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Error", description : "Invalid Data format during Data fetch... Will retry a few times later."});

			}	
		}
		catch(e) {
			setApiData({data : [], isloading : false, isapierror : true});

			console.error(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

			if (e.response && (e.response.status === 401)) {
				notification.error({message : "Authentication Failure", 
					description : `Authentication Error occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			}
			else {
				notification.error({message : "Data Fetch Exception Error", 
					description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			}
		}	
	}, [objref, getaxiosconf, starttime, endtime, aggrType, maxrecs, setApiData]);	

	useEffect(() => {
		objref.current.nxtupdtime = Date.now() + 700;

		console.log(`Auto Refresh Changes seen : isAutoRefresh = ${isAutoRefresh} currRefreshSec = ${currRefreshSec}`);

		let timer1 = setInterval(() => {

			const		oldpause = objref.current.pauseRefresh;

			if (isActiveTabCB && tabKey) {
				objref.current.pauseRefresh = !isActiveTabCB(tabKey);
			}

			if (objref.current.timeSliderIndex !== null) {
				objref.current.pauseRefresh = true;
			}	

			if (objref.current.modalCount > 0) {
				objref.current.pauseRefresh = true;
			}	

			if (false === objref.current.pauseRefresh && ((isAutoRefresh && currRefreshSec >= 5) || (objref.current.fetchmsec))) {
				const currt = Date.now();

				if (objref.current.fetchmsec === 0) {
					if (currt < objref.current.nxtupdtime) {
						return;
					}	

					objref.current.nxtupdtime = currt + currRefreshSec * 1000;
				}
				else if (objref.current.fetchmsec >= currt) {
					return;
				}	
				else {
					objref.current.fetchmsec = 0;
				}	
				
				fetchData();
			}	
			else if (oldpause === false && objref.current.pauseRefresh) {
				setPauseRefresh(true);
			}	

		}, 1000);

		return () => { 
			if (timer1) clearInterval(timer1);
		}

	}, [isAutoRefresh, currRefreshSec, objref, fetchData, isActiveTabCB, tabKey]);	
	
	const onTimeSliderChange = useCallback((newindex) => {
		if (objref && objref.current && objref.current.datahistarr.length > newindex && objref.current.datahistarr[newindex]) {
			setApiData({data : objref.current.datahistarr[newindex], isloading : false, isapierror : false});
			objref.current.timeSliderIndex = newindex;
		}
	}, [objref]);

	const onTimeSliderAfterChange = useCallback(() => {
		if (objref && objref.current) {
			if (objref.current.sliderTimer) {
				clearTimeout(objref.current.sliderTimer);
			}

			objref.current.sliderTimer = setTimeout(() => {
				setTimeSlider(null);
				objref.current.timeSliderIndex = null;
			}, 15000);
		}
	}, [objref]);

	const getTimeSliderMarks = useCallback(() => {
		let		markobj = {};

		if (objref && objref.current && objref.current.datahistarr.length) {
			const			datahistarr = objref.current.datahistarr;

			for (let i = 0;  i < datahistarr.length; ++i) {
				if (datahistarr[i] && datahistarr[i].starttime) {
					markobj[i] = moment(datahistarr[i].starttime, moment.ISO_8601).format("HH:mm:ss");
				}
			}	
		}

		return markobj;

	}, [objref]);	

	useEffect(() => {
		console.log('Filter Changes seen : Cutrent Filter is ', filterStr);
		objref.current.fetchmsec = Date.now() + 1000;
	}, [objref, filterStr]);

	const onFilterCB = useCallback((newfilter) => {
		setFilterStr(newfilter);
	}, []);	

	const onResetFilters = useCallback(() => {
		setFilterStr();
	}, []);	

	// Currently not used
	// eslint-disable-next-line
	const onHistorical = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs) => {
		if (!date || !dateString) {
			return;
		}

		let			tstarttime, tendtime;

		if (safetypeof(date) === 'array') {
			if (date.length !== 2 || safetypeof(dateString) !== 'array' || false === date[0].isValid() || false === date[1].isValid()) {
				return `Invalid Historical Date Range set...`;
			}	

			tstarttime = dateString[0];
			tendtime = dateString[1];
		}
		else {
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				return `Invalid Historical Date set ${dateString}...`;
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

		const			tabKey = `HostDashboard_${Date.now()}`;
		
		CreateTab('Host Dashboard', 
			() => { return <HostDashboard autoRefresh={false} starttime={tstarttime} endtime={tendtime} aggrType={aggrType} filter={fstr} name={name}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [filter, name, addTabCB, remTabCB, isActiveTabCB]);	

	const hostinfocb = useCallback((filt) => {
		let			newfil;

		if (filter && filt) {
			newfil = `(${filter} and ${filt})`;
		}
		else if (filter) newfil = filter;
		else newfil = filt;

		hostinfoTableTab(
		{
			filter 			: newfil, 
			addTabCB, 
			remTabCB, 
			isActiveTabCB,
		});
	}, [filter, addTabCB, remTabCB, isActiveTabCB]);


	const settingsmemo = useMemo(() => {
		const		isfilter = (filterStr && filterStr.length > 0);

		return (
		<>
		<div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>

		<div style={{ display: 'flex', flexDirection: 'row' }}>
		<Space>

		{!isfilter && autoRefresh && (
		<Popover title='Apply Dashboard Filters' content=<HostStateMultiQuickFilter filterCB={onFilterCB} /> >
		<Button>Apply Dashboard Filters</Button>
		</Popover>
		)}

		{isfilter && autoRefresh && (
		<Popover title='Filters Active' content=<Tag color='cyan'>{filterStr}</Tag>>
		<Button onClick={onResetFilters}>Reset All Filters</Button>
		</Popover>
		)}

		<ButtonModal buttontext='Search Host State' width={'90%'} okText="Cancel"
			contentCB={() => (
				<GenericSearchWrap title='Search Host State'
					inputCategory='hosts' inputSubsys='hoststate' maxrecs={50000} filter={filter}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
			)} />
					
		{!starttime && <Button onClick={() => (
			Modal.confirm({
				title : <span style={{ fontSize : 16 }} ><strong>Apply Optional Host Info Filters</strong></span>,

				content : <MultiFilters filterCB={hostinfocb} filterfields={hostinfofields} />,
				width : '80%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
				okText : 'Get All Hosts System Info',
				onOk : () => hostinfocb(),
				okType : 'primary',
				cancelType : 'primary',
			})	

			)}>Get Hosts System Info</Button>}
				
		</Space>
		</div>


		<div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
		{autoRefresh && <div style={{ marginLeft : 24 }}>
			<Space>
			<span><Text><i>Auto Refresh </i></Text></span>
			<Switch checked={isAutoRefresh} onChange={(checked) => { setAutoRefresh(checked); }} /> 
			{!isAutoRefresh && <Button onClick={(e) => objref.current.fetchmsec = Date.now()}>Refresh Data</Button>}
			</Space>
		</div>}


		</div>

		</div>
		</>
		);

	}, [autoRefresh, isAutoRefresh, objref, filterStr, onFilterCB, onResetFilters, hostinfocb, starttime, filter, addTabCB, remTabCB, isActiveTabCB]);	

	let			hdrtag = null, filtertag = null, bodycont = null, slidercont = null;

	if (objref.current && objref.current.filterset) {
		filtertag = <Tag color='cyan'>Filters Set</Tag>;
	}	

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && safetypeof(data.summary) === 'object' && Array.isArray(data.hoststate)) { 
			if (isAutoRefresh && objref.current.pauseRefresh === false) {
				hdrtag = <Tag color='green'>Running with Auto Refresh every {currRefreshSec} sec</Tag>;
			}
			else if (isAutoRefresh) {
				hdrtag = <><Tag color='green'>Running with Auto Refresh every {currRefreshSec} sec</Tag><Tag color='blue'>Auto Refresh Paused</Tag></>;
			}	
			else {
				hdrtag = <Tag color='blue'>Auto Refresh Disabled</Tag>;
			}	

			if (objref.current.prevdata !== data) {
				if (!objref.current.isrange) {
					objref.current.prevbodycont = (
						<>
						<section style={{ textAlign: 'center', marginTop: 15, marginBottom: 10 }}>
						<HostSummary normdata={data} onRow={tableOnRow} modalCount={modalCount} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
						</section>

						<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 16 }} >
						<Title level={4}>List of Hosts</Title>
						<GyTable columns={hostColumns(true)} modalCount={modalCount} onRow={tableOnRow} dataSource={data.hoststate} rowKey="parid" scroll={getTableScroll()}  />
						</div>
						</>
					);
				}
				else {
					objref.current.prevbodycont = (
						<>
						<section style={{ textAlign: 'center', marginTop: 15, marginBottom: 10 }}>
						<HostRangeSummary normdata={data} aggrType={aggrType} onRow={tableOnRow} modalCount={modalCount} 
									addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
						</section>

						<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 16 }} >
						<Title level={4}>List of Hosts</Title>
						<GyTable columns={hostRangeColumns(aggrType)} modalCount={modalCount} onRow={tableOnRow} dataSource={data.hoststate} rowKey="parid" scroll={getTableScroll()} />
						</div>
						</>
					);

				}	
			}

			bodycont = (
				<>
				<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />
				{objref.current.prevbodycont}
				</>
			);

			objref.current.prevdata = data;
		
			/*console.log(`Host Data seen : ${JSON.stringify(data).slice(0, 256)}`);*/

		}
		else {
			hdrtag = (<Tag color='red'>Data Error</Tag>);
			bodycont = (
				<>
				<Alert type="error" showIcon message="Invalid data seen. Will retry after a few seconds..." />);
				{objref.current.prevbodycont}
				</>
			);

			if (isAutoRefresh === false) {
				objref.current.fetchmsec = Date.now() + 15000;
			}

			console.log(`Host Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = (
				<>
				<Alert type="error" showIcon message="Error Encountered" description={emsg} />
				{objref.current.prevbodycont}
				</>
				);
			
			if (isAutoRefresh === false) {
				objref.current.fetchmsec = Date.now() + 15000;
			}

			console.log(`Host Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
		}
		else {
			hdrtag = <Tag color='blue'>Loading Data</Tag>;

			bodycont = (
				<>
				<Alert type="info" showIcon message="Loading Data..." />
				{objref.current.prevbodycont}
				</>
				);
		}
	}

	if (isAutoRefresh) {
		slidercont = (
			<>
			<h4 style={{ textAlign : 'center', marginTop : 20 }} ><em><strong>Recent Time History Slider</strong></em></h4>
			<div style={{ marginLeft : 120, marginRight : 120, marginBottom: 30 }} >
			<Slider marks={getTimeSliderMarks()} min={0} max={objref.current.datahistarr.length} 
				onChange={onTimeSliderChange} onAfterChange={onTimeSliderAfterChange} tooltipVisible={false} />
			</div>	
			</>	
		)	
	}	

	return (
		<>
		<Title level={4}><em>Global Host Dashboard{ filter ? ' with input filters' : ''}</em></Title>

		{hdrtag}{filtertag}

		<div style={{ marginTop: 30, marginBottom: 30, border: '1px groove #7a7aa0', padding: 10 }}>

		{settingsmemo}
		
		</div>
		
		<div style={{ marginLeft : 'auto', marginRight : 'auto' }} >

		<ErrorBoundary>
		{slidercont}
		{bodycont}
		</ErrorBoundary>
		
		</div>

		</>
	);
}



