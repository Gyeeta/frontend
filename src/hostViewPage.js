
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {Typography, Space, Switch, Button, Empty, Tag, Popover, Alert, Modal, notification, Card, Descriptions, Slider, Statistic, Row, Col, Input } from 'antd';
import { CheckSquareTwoTone, CloseOutlined } from '@ant-design/icons';

import {useMediaQuery} from 'react-responsive';
import moment from 'moment';
import axios from 'axios';
import {format} from "d3-format";

import {useFetchApi, ComponentLife, ButtonModal, safetypeof, CreateLinkTab, CreateTab, validateApi, mergeMultiMadhava, 
	capitalFirstLetter, fixedArrayAddItems, stateEnum, ButtonJSONDescribe, LoadingAlert, getErrorString, JSONDescription} from './components/util.js';
import {TimeRangeAggrModal} from './components/dateTimeZone.js';
import {SearchTimeFilter} from './multiFilters.js';
import {HostMonitor} from './hostMonitor.js';
import {StateBadge} from './components/stateBadge.js';
import {GyTable, getTableScroll} from './components/gyTable.js';
import {NodeApis} from './components/common.js';
import {SvcDashboard, svcTableTab} from './svcDashboard.js';
import {CPUMemPage, cpumemTableTab} from './cpuMemPage.js';
import {ProcDashboard, procTableTab} from './procDashboard.js';
import {NetDashboard} from './netDashboard.js';
import {MultiFilters, HostMultiFilters} from './multiFilters.js';

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
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
	},
	] : [];

	
	return [
	...globcol,
	{
		title :		'Host State',
		key :		'state',
		dataIndex :	'state',
		gytype :	'string',
		render : 	state => StateBadge(state, state),
	},	
	{
		title :		'# Service Issues',
		key :		'nlistissue',
		dataIndex :	'nlistissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Severe Services',
		key :		'nlistsevere',
		dataIndex :	'nlistsevere',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Total Services',
		key :		'nlisten',
		dataIndex :	'nlisten',
		gytype :	'number',
		responsive : 	['lg'],
		render : 	!isglob ? ((num) => <Button type="link">{num}</Button>) : undefined,
	},
	{
		title :		'Host CPU Issue',
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'boolean',
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor={rec.severecpu ? 'bold red' : 'red'}  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		responsive : 	['lg'],
	},
	{
		title :		'Host Mem Issue',
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'boolean',
		render : 	(val, rec) => (val === true ? <CheckSquareTwoTone twoToneColor={rec.severecpu ? 'bold red' : 'red'}  style={{ fontSize: 18 }} /> : <CloseOutlined style={{ color: 'green'}}/>),
		responsive : 	['lg'],
	},
	{
		title :		'# Process Issues',
		key :		'nprocissue',
		dataIndex :	'nprocissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Severe Processes',
		key :		'nprocsevere',
		dataIndex :	'nprocsevere',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Total Processes',
		key :		'nproc',
		dataIndex :	'nproc',
		gytype :	'number',
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
		render : 	text => <Button type="link">{text}</Button>,
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
	},
	{
		title :		'# Bad States',
		key :		'detailissues',
		dataIndex :	'detailissues',
		gytype :	'number',
		render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : undefined }} >{num} of {rec.detailrecs}</span>,
	},	
	{
		title :		`${aggrType} Service Issues`,
		key :		'listissue',
		dataIndex :	'listissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Severe Service Issues`,
		key :		'listsevere',
		dataIndex :	'listsevere',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Process Issues`,
		key :		'procissue',
		dataIndex :	'procissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Severe Process Issues`,
		key :		'procsevere',
		dataIndex :	'procsevere',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} CPU Issues`,
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Memory Issues`,
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
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
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
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
		render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : undefined }} >{num} of {rec.inrecs}</span>,
	},	
	{
		title :		`${aggrType} Service Issues`,
		key :		'nlistissue',
		dataIndex :	'nlistissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Total Services`,
		key :		'nlisten',
		dataIndex :	'nlisten',
		gytype :	'number',
		responsive : 	['lg'],
		render : 	!isglob ? ((num) => <Button type="link">{num}</Button>) : undefined,
	},
	{
		title :		`${aggrType} Process Issues`,
		key :		'nprocissue',
		dataIndex :	'nprocissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Total Processes`,
		key :		'nproc',
		dataIndex :	'nproc',
		gytype :	'number',
		responsive : 	['lg'],
	},
	{
		title :		`${aggrType} CPU Issues`,
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${aggrType} Mem Issues`,
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
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
		render : 	!isglob ? ((text) => <Button type="link">{text}</Button>) : undefined,
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
		
		return CreateLinkTab(<span><i>Monitor Host State</i></span>, 'Monitor Host State',
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
			hinfo = JSONDescription({jsondata : data, fieldCols : hostinfofields, titlestr : `Host ${data.host} System Info`, column : 3});
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
					customColumns, customTableColumns, sortColumns, sortDir})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
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

	}, [doFetch, filter, maxrecs, aggrType, aggrfilter, parid, useAggr, customColumns, customTableColumns, sortColumns, sortDir]);

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

				let			columns, rowKey, titlestr;

				if (customColumns && customTableColumns) {
					columns = customTableColumns;
					rowKey = "rowid";
					titlestr = "Host Info";
				}
				else {
					columns = hostInfoColumns;
					rowKey = "parid"; 

					titlestr = !filter && !name ? 'Global Hosts System Info' : !name ? 'Hosts System Info' : `${name} Hosts System Info`;

					if (useAggr) {
						titlestr = 'Aggregated ' + titlestr;
					}	
				}

				hinfo = (
					<>
					<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
					<Title level={4}>{titlestr}</Title>
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
		const		tstart = moment(rec.time, moment.ISO_8601).subtract(5, 'minute').format();
		const		tend = moment(rec.time, moment.ISO_8601).add(3, 'seconds').format();
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host State around Record</i></span>, 'Host State History',
					() => { return <HostMonitor parid={paridin} isRealTime={false} starttime={tstart} endtime={tend}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	

	const getCPUMemHistory = () => {
		const		tstart = moment(rec.time, moment.ISO_8601).subtract(5, 'minute').format();
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
		const		tstart = moment(rec.time, moment.ISO_8601).subtract(5, 'minute').format();
		const		tend = moment(rec.time, moment.ISO_8601).add(15, 'seconds').format();
		const		tabKey = `NetFlow_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Host Network Flow around Record</i></span>, 'Host Network Flow ', 
					() => { return <NetDashboard parid={paridin} autoRefresh={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							/> }, tabKey, addTabCB);
	};


	const getHostMonitorLink = () => {
		const		tabKey = `HostMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Realtime Host State</i></span>, 'Monitor Host State',
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
		const		tstartnew = moment(rec.time, moment.ISO_8601).subtract(5, 'seconds').format();
		const		tendnew = moment(rec.time, moment.ISO_8601).add(5, 'seconds').format();

		return <Button type='dashed' onClick={() => {
			svcTableTab({parid : paridin, hostname : rec.host, starttime : tstartnew, endtime : tendnew, filter, addTabCB, remTabCB, isActiveTabCB, isext : true});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter) => {
		const		tstartnew = moment(rec.time, moment.ISO_8601).subtract(5, 'seconds').format();
		const		tendnew = moment(rec.time, moment.ISO_8601).add(5, 'seconds').format();

		return <Button type='dashed' onClick={() => {
			procTableTab({parid : paridin, hostname : rec.host, starttime : tstartnew, endtime : tendnew, filter, addTabCB, remTabCB, isActiveTabCB, isext : true});
			}} >{linktext}</Button>;
	};

	const getCpumemStateTable = (linktext, filter) => {
		const		tstartnew = moment(rec.time, moment.ISO_8601).subtract(5, 'seconds').format();
		const		tendnew = moment(rec.time, moment.ISO_8601).add(5, 'seconds').format();

		return <Button type='dashed' onClick={() => {
			cpumemTableTab({parid : paridin, hostname : rec.host, starttime : tstartnew, endtime : tendnew, filter, addTabCB, remTabCB, isActiveTabCB});
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
			{rec.nlistissue > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlistissue)}</span>, `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Severe Services</em>}>
			{rec.nlistsevere > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlistsevere)}</span>, `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Total Services</em>}>
			<Space align='center'>
			<span>{rec.nlisten}</span>
			</Space>
		</Descriptions.Item>

		<Descriptions.Item label={<em># Process Issues</em>}>
			{rec.nprocissue > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprocissue)}</span>, `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Severe Processes</em>}>
			{rec.nprocsevere > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprocsevere)}</span>, `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em># Total Grouped Processes</em>}>
			<Space align='center'>
			<span>{rec.nproc}</span>
			</Space>
		</Descriptions.Item>
		
		{rec.cpuissue && <Descriptions.Item label={<em>Host CPU State</em>}>
			{getCpumemStateTable(StateBadge(rec.severecpu ? 'Severe' : 'Bad'), `({ cpumem.cpu_state in 'Bad','Severe' })`)}
		</Descriptions.Item>}
		
		{rec.memissue && <Descriptions.Item label={<em>Host Memory State</em>}>
			{getCpumemStateTable(StateBadge(rec.severemem ? 'Severe' : 'Bad'), `({ cpumem.mem_state in 'Bad','Severe' })`)}
		</Descriptions.Item>}

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
						at time {normdata.starttime} ({moment(normdata.starttime, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss.SSS Z")})</span></Space>
					</em>} </div> :
					<span>{desc} retrieval not currently implemented...</span>,

				content : (
					<>
					<ComponentLife stateCB={modalCount} />
					{typeof filt === 'function' ?
					<GyTable columns={hostColumns(true)} modalCount={modalCount} onRow={onRow} dataSource={normdata.hoststate.filter(filt)} rowKey="parid" /> :
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
			at {normdata.starttime} ({moment(normdata.starttime, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss.SSS Z")}) </span>
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
				label={<em># Total Services</em>}>
				{format(",")(summary.nlisten)}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Service Issues</em>}>
				{summary.nlisten_issue > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nlisten_issue} />,
					'# Service Issues', null) : 0}
			</Descriptions.Item>
			
			<Descriptions.Item 
				label={<em># Severe Service Issues</em>}>
				{summary.nlisten_severe > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nlisten_severe} />,
					'# Severe Service Issues', null) : 0}
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
		
		return CreateLinkTab(<span><i>Host State Realtime</i></span>, 'Monitor Host State',
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
			svcTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true});
			}} >{linktext}</Button>;
	};

	const getCpumemStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			cpumemTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB});
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

export function HostRangeAggrTimeCard({rec, parid, aggrMin, addTabCB, remTabCB, isActiveTabCB})
{
	const 		isTabletOrMobile = useMediaQuery({ maxWidth: 1224 });
	const		paridin = rec.parid ?? parid;
	let		aggregatesec, startmom, endmom, starttime, endtime;

	startmom = moment(rec.time, moment.ISO_8601); 
	endmom = moment(rec.time, moment.ISO_8601).add(aggrMin, 'minutes');

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
		
		return CreateLinkTab(<span><i>Host State Realtime</i></span>, 'Monitor Host State',
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
			svcTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB, isext : true});
			}} >{linktext}</Button>;
	};

	const getCpumemStateTable = (linktext, filter) => {
		return <Button type='dashed' onClick={() => {
			cpumemTableTab({parid : paridin, hostname : rec.host, starttime : starttime, endtime : endtime, maxrecs : 20000, filter, addTabCB, remTabCB, isActiveTabCB});
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


		<Descriptions.Item label={<em>Aggr Service Issues</em>}>
			{rec.nlistissue > 0 ? getSvcStateTable(format(",")(rec.nlistissue), `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Severe Service Issues</em>}>
			{rec.nlistsevere > 0 ? getSvcStateTable(format(",")(rec.nlistsevere), `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Total Services</em>}>
			<Space align='center'>
			<span>{format(",")(rec.nlisten)}</span>
			</Space>
		</Descriptions.Item>


		<Descriptions.Item label={<em>Aggr Process Issues</em>}>
			{rec.nprocissue > 0 ? getProcStateTable(format(",")(rec.nprocissue), `({ state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Severe Process Issues</em>}>
			{rec.nprocsevere > 0 ? getProcStateTable(format(",")(rec.nprocsevere), `({ state = 'Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Grouped Processes </em>}>
			<Space align='center'>
			<span>{format(",")(rec.nproc)}</span>
			</Space>
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Host CPU Issues</em>}>
			{rec.cpuissue > 0 ? getCpumemStateTable(format(",")(rec.cpuissue), `({ cpumem.cpu_state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>

		<Descriptions.Item label={<em>Aggr Host Memory Issues</em>}>
			{rec.memissue > 0 ? getCpumemStateTable(format(",")(rec.memissue), `({ cpumem.mem_state in 'Bad','Severe' })`) : 0}
		</Descriptions.Item>


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
					<GyTable columns={hostRangeColumns(aggrType)} modalCount={modalCount} onRow={onRow} dataSource={normdata.hoststate.filter(filt)} rowKey="parid" /> :
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
					customColumns, customTableColumns, sortColumns, sortDir})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
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
				},	

			},
			timeout	: 100 * 1000,
		};

		const xfrmresp = (apidata) => {
			validateApi(apidata);
					
			return mergeMultiMadhava(apidata, "hoststate");
		};	

		try {
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

	}, [parid, aggrMin, aggrType, doFetch, endtime, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir]);

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

				let			columns, rowKey, titlestr, timestr;

				if (customColumns && customTableColumns) {
					columns = customTableColumns;
					rowKey = "rowid";
					titlestr = "Host State";
					timestr = <span style={{ fontSize : 14 }} > for time range {starttime} to {endtime}</span>;
				}	
				else if (!isrange) {
					columns = hostColumns(!parid);
					rowKey = !parid ? 'parid' : 'time';

					titlestr = name ? `${name} Host State` : !filter && !parid ? 'Global Host State' : 'Host State';
					timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format()} </span>;
				}
				else {
					rowKey = ((record) => record.time + record.parid);

					titlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : ''} Host State`;
					columns = !useAggr ? hostTimeColumns(!parid) : (aggrMin ? hostRangeTimeColumns(aggrType, !parid) : hostRangeNoSummColumns(aggrType, !parid));
					timestr = <span style={{ fontSize : 14 }} > for time range {starttime} to {endtime}</span>;
				}	

				hinfo = (
					<>
					<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
					<Title level={4}>{titlestr}</Title>
					{timestr}
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

export function hostTableTab({parid, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, maxrecs, name, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title = 'Host States',
					customColumns, customTableColumns, sortColumns, sortDir})
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

	if (!modal) {
		const			tabKey = `HostState_${Date.now()}`;

		CreateTab(title ?? "Host State", 
			() => { return <HostStateSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} /> }, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Host State",

			content : <HostStateSearch parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} />,
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
					customColumns, customTableColumns, sortColumns, sortDir})
{
	if (!modal) {
		const			tabKey = `HostInfo_${Date.now()}`;

		CreateTab(title ?? "Host Info", 
			() => { return <HostInfoSearch parid={parid} useAggr={useAggr} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					tabKey={tabKey} customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} /> }, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Host Info",

			content : <HostInfoSearch parid={parid} useAggr={useAggr} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					customColumns={customColumns} customTableColumns={customTableColumns} sortColumns={sortColumns} sortDir={sortDir} />,
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
			notification.error({message : "Data Fetch Exception Error", 
					description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
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

	const onSearch = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs, aggrfilter) => {
		if (!date || !dateString) {
			return;
		}

		let			tstarttime, tendtime;

		if (safetypeof(date) === 'array') {
			if (date.length !== 2 || safetypeof(dateString) !== 'array' || false === date[0].isValid() || false === date[1].isValid()) {
				return `Invalid Search Date Range set...`;
			}	

			tstarttime = dateString[0];
			tendtime = dateString[1];
		}
		else {
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				return `Invalid Search Date set ${dateString}...`;
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

		hostTableTab({starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, filter : fstr, aggrfilter, maxrecs, addTabCB, remTabCB, isActiveTabCB});
					

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	


	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range' showTime={true} showRange={true} minAggrRangeMin={0} alwaysShowAggrType={true} disableFuture={true} />;
	}, []);

	const timesearchcb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range' showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const hostfiltercb = useCallback((onfiltercb) => {
		return <HostMultiFilters filterCB={onfiltercb} />;
	}, []);	

	const filtercb = useCallback((onfiltercb) => {
		return <HostStateMultiQuickFilter filterCB={onfiltercb} />;
	}, []);	

	const aggrfiltercb = useCallback((onfiltercb) => {
		return <HostStateAggrFilter filterCB={onfiltercb} />;
	}, []);	

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

		<ButtonModal buttontext='Search Host States' width={800} okText="Cancel"
			contentCB={() => <SearchTimeFilter callback={onSearch} title='Search Host States' ismaxrecs={true} defaultmaxrecs={50000}
							timecompcb={timesearchcb} filtercompcb={filtercb} aggrfiltercb={aggrfiltercb} />} />

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

		<ButtonModal buttontext='Get Historical Data' width={800} okText="Cancel"
			contentCB={() => <SearchTimeFilter callback={onHistorical} title='Get Historical Data' timecompcb={timecb} filtercompcb={hostfiltercb} />} />
		</div>

		</div>
		</>
		);

	}, [autoRefresh, isAutoRefresh, objref, filterStr, onFilterCB, onResetFilters, onHistorical, onSearch, timesearchcb, timecb, filtercb, aggrfiltercb, hostfiltercb, hostinfocb, starttime]);	

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
						<GyTable columns={hostColumns(true)} modalCount={modalCount} onRow={tableOnRow} dataSource={data.hoststate} rowKey="parid" />
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
						<GyTable columns={hostRangeColumns(aggrType)} modalCount={modalCount} onRow={tableOnRow} dataSource={data.hoststate} rowKey="parid" />
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
		
		<div style={{ maxWidth : 1920, marginLeft : 'auto', marginRight : 'auto' }} >

		<Space direction="vertical">
			<ErrorBoundary>
			{slidercont}
			{bodycont}
			</ErrorBoundary>
		</Space>
		
		</div>

		</>
	);
}



