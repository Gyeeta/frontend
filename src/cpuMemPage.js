

import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import moment from 'moment';
import axios from 'axios';

import {Button, Space, Slider, Descriptions, Statistic, Modal, Typography, Empty, Tag, Alert, Input, message, Row, Col, notification} from 'antd';
import {PauseCircleOutlined, PlayCircleOutlined} from '@ant-design/icons';

import {useMediaQuery} from 'react-responsive';
import {format} from "d3-format";

import './hostViewPage.css';

import {NodeApis} from './components/common.js';
import {ColumnInfo, fixedSeriesAddItems, getTimeEvent, getTimeSeries, stateColorStyle, stateScatterRadius, getScatterObj, GyLineChart} from './components/gyChart.js';
import {safetypeof, getStateColor, MBStrFormat, validateApi, CreateRectSvg, CreateCircleSvg, fixedArrayAddItems, ComponentLife,
	capitalFirstLetter, CreateLinkTab, CreateTab, mergeMultiMadhava, ButtonModal, stateEnum, useFetchApi, LoadingAlert,
	JSONDescription, getMinEndtime, arrayFilter, strTruncateTo, getLocalTime} from './components/util.js';
import {TimeRangeAggrModal} from './components/dateTimeZone.js';
import {GyTable, getTableScroll} from './components/gyTable.js';
import {StateBadge} from './components/stateBadge.js';
import {HostInfoDesc} from './hostViewPage.js';
import {MultiFilters, hostfields} from './multiFilters.js';
import {GenericSearchWrap, SearchWrapConfig} from './multiFilters.js';
import {svcTableTab} from './svcDashboard.js';
import {procTableTab} from './procDashboard.js';

const {ErrorBoundary} = Alert;
const {Title} = Typography;
const {Search} = Input;


export const CpuIssueSource = [
	{ name : "No Issue", value : 0 },
	{ name : "CPU Utilization Saturated", value : 1 },
	{ name : "Individual CPU core Saturation", value : 2 },
	{ name : "CPU IO Waits Issue", value : 3 },
	{ name : "Context Switches Issue", value : 4 },
	{ name : "High New Process Creation Rate", value : 5 },
	{ name : "Runnable Processes Count High", value : 6 },
];	

export const MemIssueSource = [
	{ name : "No Issue", value : 0 },
	{ name : "Resident Memory RSS Saturated", value : 1 },
	{ name : "Commit Memory Saturated", value : 2 },
	{ name : "High Memory Paging", value : 3 },
	{ name : "Memory Paging and Swapping", value : 4 },
	{ name : "Memory Page Reclaim Stalls", value : 5 },
	{ name : "Out of Memory OOM process kills", value : 6 },
	{ name : "Low Free Swap Space", value : 7 },
];

const fixedArraySize 	= 200;
const realtimesec	= 5;

const cpuTitle 		= "Host CPU Utilization %";
const csTitle 		= "Context Switches/sec";
const pgSwapTitle	= "Memory Paging vs Swapping per sec";
const forkProcTitle 	= "New Processes/sec vs Runnable Processes";
const faultStallTitle	= "Major Page Faults vs Memory Reclaim Stalls";
const rssOOMTitle	= "Resident/Committed Memory % vs Processes killed by OOM";

export const cpumemfields = [
	{ field : 'cpu_pct',		desc : 'Total CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'usercpu_pct',	desc : 'User CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'syscpu_pct',		desc : 'System CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'iowait_pct',		desc : 'IO Wait CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'cumul_cpu_pct',	desc : 'All Cores CPU %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'cs_sec',		desc : 'Context Switches/sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'forks_sec',		desc : 'New Processes/sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'procs',		desc : 'Runnable Processes',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'cpu_state',		desc : 'CPU State',			type : 'enum',		subsys : 'cpumem',	valid : null, 		esrc : stateEnum },
	{ field : 'cpuissue',		desc : 'CPU Issue Cause',		type : 'enum',		subsys : 'cpumem',	valid : null, 		esrc : CpuIssueSource },
	{ field : 'cs_p95_sec',		desc : 'p95 of Context Switches/sec',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'cpu_p95',		desc : 'p95 of Total CPU %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'fork_p95_sec',	desc : 'p95 of New Processes/sec',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'procs_p95',		desc : 'p95 of Runnable Processes',	type : 'number',	subsys : 'cpumem',	valid : null, },

	{ field : 'rss_pct',		desc : 'Resident Memory %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'rss_mb',		desc : 'Resident Memory in MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'locked_mb',		desc : 'Locked Memory in MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'commit_mb',		desc : 'Committed Memory MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'commit_pct',		desc : 'Committed Memory %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'swap_free_mb',	desc : 'Free Swap Space MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'total_mb',		desc : 'Total RAM Memory MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'pg_inout_sec',	desc : 'Page InOut /sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'swap_inout_sec',	desc : 'Page Swap InOut /sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'reclaim_stalls',	desc : 'Memory Reclaim Stalls',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'pgmajfault',		desc : 'Major Page Faults',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'oom_kill',		desc : 'Out of Memory kills',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'mem_state',		desc : 'Memory State',			type : 'enum',		subsys : 'cpumem',	valid : null, 		esrc : stateEnum },
	{ field : 'memissue',		desc : 'Memory Issue Cause',		type : 'enum',		subsys : 'cpumem',	valid : null, 		esrc : MemIssueSource },
	{ field : 'rss_pct_p95',	desc : 'p95 Resident Memory %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'pginout_p95',	desc : 'p95 Page InOut/sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'swpinout_p95',	desc : 'p95 Page Swaps InOut/sec',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'cpumem',	valid : null, },

	{ field : 'cpu_state_str',	desc : 'CPU State Analysis',		type : 'string',	subsys : 'cpumem',	valid : null, },
	{ field : 'mem_state_str',	desc : 'Memory State Analysis',		type : 'string',	subsys : 'cpumem',	valid : null, },
];	

export const aggrcpumemfields = [
	{ field : 'cpu_pct',		desc : 'Avg CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'max_cpu_pct',	desc : 'Max CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'usercpu_pct',	desc : 'User CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'syscpu_pct',		desc : 'System CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'iowait_pct',		desc : 'IO Wait CPU %',			type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'cumul_cpu_pct',	desc : 'All Cores CPU %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'cs_sec',		desc : 'Context Switches/sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'forks_sec',		desc : 'New Processes/sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'procs',		desc : 'Runnable Processes',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'cpuissue',		desc : '# Times CPU Issue',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'incpusat',		desc : 'Degrades by Total CPU %',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'incoresat',		desc : 'Degrades by Core % ',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'iniowait',		desc : 'Degrades by IO Wait %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'incs',		desc : 'Degrades by Context Switches',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'infork',		desc : 'Degrades by New Process/sec',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inrproc',		desc : 'Degrades by Runnable Process',	type : 'number',	subsys : 'cpumem',	valid : null, },

	{ field : 'rss_pct',		desc : 'Resident Memory %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'rss_mb',		desc : 'Resident Memory in MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'locked_mb',		desc : 'Locked Memory in MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'commit_mb',		desc : 'Committed Memory MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'commit_pct',		desc : 'Committed Memory %',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'swap_free_mb',	desc : 'Free Swap Space MB',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'pg_inout_sec',	desc : 'Page InOut /sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'swap_inout_sec',	desc : 'Page Swap InOut /sec',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'reclaim_stalls',	desc : 'Memory Reclaim Stalls',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'pgmajfault',		desc : 'Major Page Faults',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'oom_kill',		desc : 'Out of Memory OOM kills',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'memissue',		desc : '# Times Memory Issue',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inrsssat',		desc : 'Degrades by High RSS Memory',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'incmmsat',		desc : 'Degrades by Commit Memory',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inpginout',		desc : 'Degrades by Page In/Outs',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inswpinout',		desc : 'Degrades by Swap In/Outs',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inreclaim',		desc : 'Degrades by Reclaim Stalls',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inoom',		desc : 'Degrades by OOM kills',		type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inswpspc',		desc : 'Degrades by Swap Free Space',	type : 'number',	subsys : 'cpumem',	valid : null, },
	{ field : 'inrecs',		desc : '# Records in Aggregation',	type : 'number',	subsys : 'cpumem',	valid : null, },
];	

const hostCpuColumns = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		width :		160,
		gytype :	'string',
		fixed : 	'left',
		render :	(val) => getLocalTime(val),
	},
	{
		title :		'CPU State',
		key :		'cpu_state',
		dataIndex :	'cpu_state',
		gytype :	'string',
		width : 	100,
		render : 	state => <Button type="link">{StateBadge(state, state)}</Button>,
		fixed : 	'left',
	},	
	{
		title :		'Memory State',
		key :		'mem_state',
		dataIndex :	'mem_state',
		gytype :	'string',
		width : 	100,
		render : 	state => StateBadge(state, state),
		fixed : 	'left',
	},	
	{
		title :		'CPU %',
		key :		'cpu_pct',
		dataIndex :	'cpu_pct',
		width : 	100,
		gytype : 	'number',
	},	
	{
		title :		'User CPU %',
		key :		'usercpu_pct',
		dataIndex :	'usercpu_pct',
		width : 	100,
		gytype : 	'number',
	},	
	{
		title :		'System CPU %',
		key :		'syscpu_pct',
		dataIndex :	'syscpu_pct',
		width : 	100,
		gytype : 	'number',
	},	
	{
		title :		'IO Wait CPU %',
		key :		'iowait_pct',
		dataIndex :	'iowait_pct',
		width : 	100,
		gytype : 	'number',
	},	
	{
		title :		'All Cores CPU %',
		key :		'cumul_cpu_pct',
		dataIndex :	'cumul_cpu_pct',
		width : 	100,
		gytype : 	'number',
	},	
	{
		title :		'p95 CPU %',
		key :		'cpu_p95',
		dataIndex :	'cpu_p95',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},		
	{
		title :		'Context Switches/sec',
		key :		'cs_sec',
		dataIndex :	'cs_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'p95 Context Switches/sec',
		key :		'cs_p95_sec',
		dataIndex :	'cs_p95_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'New Processes/sec',
		key :		'forks_sec',
		dataIndex :	'forks_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'p95 New Processes/sec',
		key :		'fork_p95_sec',
		dataIndex :	'fork_p95_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Runnable Processes',
		key :		'procs',
		dataIndex :	'procs',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'p95 Runnable Processes',
		key :		'procs',
		dataIndex :	'procs',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Resident Memory %',
		key :		'rss_pct',
		dataIndex :	'rss_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 85 ? 'red' : undefined }}>{num}</span>,
	},	
	{
		title :		'p95 RSS Memory %',
		key :		'rss_pct_p95',
		dataIndex :	'rss_pct_p95',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Resident Memory MB',
		key :		'rss_mb',
		dataIndex :	'rss_mb',
		gytype : 	'number',
		width : 	100,
	},	
	{
		title :		'Committed Memory %',
		key :		'commit_pct',
		dataIndex :	'commit_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Committed Memory MB',
		key :		'commit_mb',
		dataIndex :	'commit_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Total RAM MB',
		key :		'total_mb',
		dataIndex :	'total_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Page In/Out per sec',
		key :		'pg_inout_sec',
		dataIndex :	'pg_inout_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'p95 Page InOut/sec',
		key :		'pginout_p95',
		dataIndex :	'pginout_p95',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Page Swap InOut/sec',
		key :		'swap_inout_sec',
		dataIndex :	'swap_inout_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'p95 Swap InOut/sec',
		key :		'swpinout_p95',
		dataIndex :	'swpinout_p95',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Memory Reclaim Stalls',
		key :		'reclaim_stalls',
		dataIndex :	'reclaim_stalls',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Major Page Faults',
		key :		'pgmajfault',
		dataIndex :	'pgmajfault',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Locked Memory MB',
		key :		'locked_mb',
		dataIndex :	'locked_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Out of Memory OOMs',
		key :		'oom_kill',
		dataIndex :	'oom_kill',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Free Swap MB',
		key :		'swap_free_mb',
		dataIndex :	'swap_free_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'CPU Issue Cause',
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'number',
		width : 	150,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{CpuIssueSource[num] ? CpuIssueSource[num].name : ''}</span>,
	},
	{
		title :		'Memory Issue Cause',
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'number',
		width : 	150,
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{MemIssueSource[num] ? MemIssueSource[num].name : ''}</span>,
	},
	{
		title :		'CPU State Description',
		key :		'cpu_state_str',
		dataIndex :	'cpu_state_str',
		gytype :	'string',
		responsive : 	['lg'],
		width : 	250,
		render :	(val, rec) => <span style={{ color : rec.cpuissue > 0 ? 'red' : undefined }}>{strTruncateTo(val, 100)}</span>,
	},
	{
		title :		'Memory State Description',
		key :		'mem_state_str',
		dataIndex :	'mem_state_str',
		gytype :	'string',
		responsive : 	['lg'],
		width : 	250,
		render :	(val, rec) => <span style={{ color : rec.memissue > 0 ? 'red' : undefined }}>{strTruncateTo(val, 100)}</span>,
	},
	
];

const globCpuColumns = [
	...hostCpuColumns,
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		width :		150,
		fixed : 	'right',
		render : 	text => <Button type="link">{text}</Button>,
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

const hostAggrCpuColumns = (aggrType) => {
	aggrType = capitalFirstLetter(aggrType) ?? 'Sum';
	const nosumaggr = (aggrType === 'Sum' ? 'Avg' : aggrType);

	return [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		width :		160,
		gytype :	'string',
		fixed : 	'left',
		render :	(val) => getLocalTime(val),
	},
	{
		title :		'# CPU Bad States',
		key :		'cpuissue',
		dataIndex :	'cpuissue',
		gytype :	'number',
		width : 	100,
		render : 	(num, rec) => <Button type="link"><span style={{ color : num > 0 ? 'red' : undefined }}>{num}</span> <i> of </i> {rec.inrecs} </Button>,
	},	
	{
		title :		'# Memory Bad States',
		key :		'memissue',
		dataIndex :	'memissue',
		gytype :	'number',
		width : 	100,
		render : 	(num, rec) => <Button type="link"><span style={{ color : num > 0 ? 'red' : undefined }}>{num}</span> <i> of </i> {rec.inrecs} </Button>,
	},	
	{
		title :		'Avg CPU %',
		key :		'cpu_pct',
		dataIndex :	'cpu_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		'Max CPU %',
		key :		'max_cpu_pct',
		dataIndex :	'max_cpu_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		`${nosumaggr} User CPU %`,
		key :		'usercpu_pct',
		dataIndex :	'usercpu_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		`${nosumaggr} System CPU %`,
		key :		'syscpu_pct',
		dataIndex :	'syscpu_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		`${nosumaggr} IO Wait %`,
		key :		'iowait_pct',
		dataIndex :	'iowait_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		`${nosumaggr} All Cores CPU %`,
		key :		'cumul_cpu_pct',
		dataIndex :	'cumul_cpu_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		`${nosumaggr} Context Switches/sec`,
		key :		'cs_sec',
		dataIndex :	'cs_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${nosumaggr} New Processes/sec`,
		key :		'forks_sec',
		dataIndex :	'forks_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${nosumaggr} Runnable Processes`,
		key :		'procs',
		dataIndex :	'procs',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${nosumaggr} Resident Memory %`,
		key :		'rss_pct',
		dataIndex :	'rss_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		`${nosumaggr} Resident Memory MB`,
		key :		'rss_mb',
		dataIndex :	'rss_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${nosumaggr} Committed Memory %`,
		key :		'commit_pct',
		dataIndex :	'commit_pct',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num > 0 ? num.toFixed(3) : num),
	},	
	{
		title :		`${nosumaggr} Committed Memory MB`,
		key :		'commit_mb',
		dataIndex :	'commit_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${nosumaggr} Page InOut/sec`,
		key :		'pg_inout_sec',
		dataIndex :	'pg_inout_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${nosumaggr} Swap InOut/sec`,
		key :		'swap_inout_sec',
		dataIndex :	'swap_inout_sec',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${aggrType} Reclaim Stalls`,
		key :		'reclaim_stalls',
		dataIndex :	'reclaim_stalls',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		`${aggrType} Major Faults`,
		key :		'pgmajfault',
		dataIndex :	'pgmajfault',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${aggrType} OOM Kills`,
		key :		'oom_kill',
		dataIndex :	'oom_kill',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		`${nosumaggr} Free Swap MB`,
		key :		'swap_free_mb',
		dataIndex :	'swap_free_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		`${nosumaggr} Locked Memory MB`,
		key :		'locked_mb',
		dataIndex :	'locked_mb',
		gytype : 	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},	
	{
		title :		'Degrades by Total CPU %',
		key :		'incpusat',
		dataIndex :	'incpusat',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by Core %',
		key :		'incoresat',
		dataIndex :	'incoresat',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by IO Wait %',
		key :		'iniowait',
		dataIndex :	'iniowait',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by Context Switch',
		key :		'incs',
		dataIndex :	'incs',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by New Proc/sec',
		key :		'infork',
		dataIndex :	'infork',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by Runnable Proc',
		key :		'inrproc',
		dataIndex :	'inrproc',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by High RSS Mem',
		key :		'inrsssat',
		dataIndex :	'inrsssat',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by Commit Mem',
		key :		'incmmsat',
		dataIndex :	'incmmsat',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by PageIn/Outs',
		key :		'inpginout',
		dataIndex :	'inpginout',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by SwapIn/Outs',
		key :		'inswpinout',
		dataIndex :	'inswpinout',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by Reclaim Stalls',
		key :		'inreclaim',
		dataIndex :	'inreclaim',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by OOM Kills',
		key :		'inoom',
		dataIndex :	'inoom',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	
	{
		title :		'Degrades by Low Swap Free',
		key :		'inswpspc',
		dataIndex :	'inswpspc',
		gytype : 	'number',
		width : 	100,
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }}>{format(",")(num)}</span>,
	},	

	];
};	

const globAggrCpuColumns = (aggrType) => {
	return [
	...hostAggrCpuColumns(aggrType),
	{
		title :		'Host',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		responsive : 	['lg'],
		width :		150,
		fixed : 	'right',
		render : 	text => <Button type="link">{text}</Button>,
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
};	


const cpuStateCol 	= new ColumnInfo("cpu_state", "Bad CPU State", getStateColor("Bad"), 1, "", true /* isextra */, true /* enableLegend */, false /* isnumber */,
					(event, val) => { return { fill : getStateColor(val) } }); 
const memStateCol 	= new ColumnInfo("mem_state", "Bad Memory State", getStateColor("Bad"), 1, "", true /* isextra */, true /* enableLegend */, false /* isnumber */, 
					(event, val) => { return { fill : getStateColor(val) } }); 

const cpuColumns = [
	new ColumnInfo("cpu_pct", "Total CPU %", "pink", 1), 
	new ColumnInfo("usercpu_pct", "User CPU %", "green", 1), 
	new ColumnInfo("syscpu_pct", "System CPU %", "orange", 1), 
	new ColumnInfo("iowait_pct", "IO Wait %", "steelblue", 1), 
	cpuStateCol, memStateCol,
];

const csColumns = [
	new ColumnInfo("cs_sec", "Context Switches/sec", "orange", 1, ",.0f"), 
	cpuStateCol, memStateCol,
];

const pgSwapColumns = [
	new ColumnInfo("pg_inout_sec", "Memory Paging In/Out per sec", "DarkSeaGreen", 1, ",.0f"), 
	cpuStateCol, memStateCol,
	new ColumnInfo("swap_inout_sec", "Pages Swapped In/Out per sec", "orange", 2, ",.0f"), 
];


const forkProcColumns = [
	new ColumnInfo("forks_sec", "New Processes/sec", "DarkSalmon", 1, ",.0f"), 
	cpuStateCol, memStateCol,
	new ColumnInfo("procs", "Runnable Processes", "DarkSeaGreen", 2, ",.0f"), 
];

const faultStallColumns = [
	new ColumnInfo("pgmajfault", "Major Page Faults", "orange", 1, ",.0f"), 
	cpuStateCol, memStateCol,
	new ColumnInfo("reclaim_stalls", "Memory Reclaim Stalls", "steelblue", 2, ",.0f"), 
];

const rssOOMColumns = [
	new ColumnInfo("commit_pct", "Committed Memory %", "DarkSeaGreen", 1, ",.0f"), 
	new ColumnInfo("rss_pct", "Resident Memory %", "steelblue", 1, ",.0f"), 
	cpuStateCol, memStateCol,
	new ColumnInfo("oom_kill", "Processes killed by OOM", "pink", 2, ",.0f"), 
];


const cpuScatterStyle = (column, event) => { return stateColorStyle(column, event, "cpu_state") };
const memScatterStyle = (column, event) => { return stateColorStyle(column, event, "mem_state", 0.5) };

const cpuRadiusCb = (column, event) => { return stateScatterRadius(column, event, "cpu_state", true) };
const memRadiusCb = (column, event) => { return stateScatterRadius(column, event, "mem_state", true) };

function getScatterArray(piggybackCol, yaxis, cRadiusCb, mRadiusCb)
{ 
	return [
		getScatterObj("cpu_state", yaxis, cpuScatterStyle, cRadiusCb, ".0f", "rect", piggybackCol),
		getScatterObj("mem_state", yaxis, memScatterStyle, mRadiusCb, ".0f", "circle", piggybackCol),
	];
}	

class ChartInfo
{
	constructor(title, columns)
	{
		this.title_		= title;
		this.columns_		= columns;
		this.chartobj_		= [
		{	// Y1
			timeseries_	: null,
			fixedarray_	: [],
			columns_	: columns,
			baseline_	: 0,
			baseline2_	: 0,
		},
		{	// Y2
			timeseries_	: null,
			fixedarray_	: [],
			columns_	: columns,
			baseline_	: 0,
			baseline2_	: 0,
		},
		];
	}	
};	

// Returns true or exception string
function getChartSeries(chartobj, newdata, isrealtime, baselinefield, baseline2field, isY1series = true)
{
	try {
		chartobj.baseline_		= baselinefield ? Number(newdata[newdata.length - 1][baselinefield]) : 0;
		chartobj.baseline2_		= baseline2field ? Number(newdata[newdata.length - 1][baseline2field]) : 0;

		if (isrealtime === false) {
			chartobj.timeseries_ = getTimeSeries(newdata, chartobj.columns_, isY1series, "time", true /* sortdata */);

			return true;
		}

		const		eventarr = [];
		const		startidx = newdata.length < fixedArraySize ? 0 : newdata.length - fixedArraySize;	

		for (let i = startidx; i < newdata.length; ++i) {
			eventarr.push(getTimeEvent(newdata[i], chartobj.columns_, isY1series, 'time'));
		}	

		chartobj.timeseries_ = fixedSeriesAddItems(eventarr, chartobj.fixedarray_, fixedArraySize, chartobj.columns_, isY1series, true /* sortdata */);

		return true;
	}
	catch(e) {
		console.log(`Exception caught while updating chart series : ${e}\n${e.stack}\n`);
		return e.message;
	}	
}	

function initSummary(summary)
{
	summary.nrecs			= 0;
	summary.naggrrecs		= 0;

	summary.starttime		= '';
	summary.endtime			= '';

	summary.cpubadsevere		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.membadsevere		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.cpuoverp95		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.csoverp95		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.pgoverp95		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.forkoverp95 		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};

	summary.swapping		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.reclaims		= {
						nrecs		: 0,
						firstidx	: 0,
						lastidx		: 0,
					};	

	summary.cpuissuesourcearr		= new Array(CpuIssueSource.length);

	for (let i = 0; i < summary.cpuissuesourcearr.length; ++i) {
		summary.cpuissuesourcearr[i]	= {
							nrecs		: 0,
							firstidx	: 0,
							lastidx		: 0,
						};	
	}					

	summary.incpusat 	= summary.cpuissuesourcearr[1];
	summary.incoresat 	= summary.cpuissuesourcearr[2];
	summary.iniowait	= summary.cpuissuesourcearr[3];
	summary.incs	 	= summary.cpuissuesourcearr[4];
	summary.infork	 	= summary.cpuissuesourcearr[5];
	summary.inrproc 	= summary.cpuissuesourcearr[6];

	summary.memissuesourcearr		= new Array(MemIssueSource.length);

	for (let i = 0; i < summary.memissuesourcearr.length; ++i) {
		summary.memissuesourcearr[i]	= {
							nrecs		: 0,
							firstidx	: 0,
							lastidx		: 0,
						};	
	}					

	summary.inrsssat 	= summary.memissuesourcearr[1];
	summary.incmmsat 	= summary.memissuesourcearr[2];
	summary.inpginout 	= summary.memissuesourcearr[3];
	summary.inswpinout 	= summary.memissuesourcearr[4];
	summary.inreclaim 	= summary.memissuesourcearr[5];
	summary.inoom	 	= summary.memissuesourcearr[6];
	summary.inswpspc 	= summary.memissuesourcearr[7];

	summary.statemarker	= [];
}	

function setAggrDataState(data)
{
	if ((safetypeof(data) !== 'array') || (data.length === 0)) {
		return data;
	}	

	try {
		for (let i = 0; i < data.length; ++i) {
			const		item = data[i];
				
			// If > 10 % issue records mark state as Bad
			if ((item.cpuissue > 0) && (item.cpuissue * 10 >= item.inrecs)) {
				item.cpu_state = 'Bad';
			}	
			else {
				item.cpu_state = 'Good';
			}

			if ((item.memissue > 0) && (item.memissue * 10 >= item.inrecs)) {
				item.mem_state = 'Bad';
			}	
			else {
				item.mem_state = 'Good';
			}
		}	

		return data;
	}
	catch(e) {
		console.log(`Exception occured while calculating Aggr Data State : ${e}`);

		return data;
	}	
}
	
function calcSummary(data, summary, isaggregated)
{
	try {
		if ((safetypeof(data) !== 'array') || (data.length === 0)) {
			return;
		}	

		initSummary(summary);
		
		let			lastitem = data[data.length - 1];
		let			startmom = moment(data[0].time, moment.ISO_8601), endmom = moment(lastitem.time, moment.ISO_8601);

		if (isaggregated === false) {
			summary.nrecs		= data.length;
		}
		else {
			summary.naggrrecs	= data.length;
		}	
		summary.dataarr		= data;

		for (let i = 0; i < data.length; ++i) {
			const		item = data[i];
			const		mom = moment(item.time, moment.ISO_8601);
			let		statemarker = false;

			if (mom < startmom) {
				startmom = mom;
			}	

			if (mom > endmom) {
				endmom = mom;
			}	
			
			if (isaggregated === false) {
				if (item.cpu_state === 'Bad' || item.cpu_state === 'Severe') {
					if (summary.cpubadsevere.nrecs === 0) {
						summary.cpubadsevere.firstidx = i;
					}	

					summary.cpubadsevere.nrecs++;
					summary.cpubadsevere.lastidx = i;

					statemarker = true;
				}	

				if (item.mem_state === 'Bad' || item.mem_state === 'Severe') {
					if (summary.membadsevere.nrecs === 0) {
						summary.membadsevere.firstidx = i;
					}	

					summary.membadsevere.nrecs++;
					summary.membadsevere.lastidx = i;

					statemarker = true;
				}	
				
				if (item.cpu_pct > lastitem.cpu_p95) {
					if (summary.cpuoverp95.nrecs === 0) {
						summary.cpuoverp95.firstidx = i;
					}	

					summary.cpuoverp95.nrecs++;
					summary.cpuoverp95.lastidx = i;
				}	

				if (item.cs_sec > lastitem.cs_p95_sec) {
					if (summary.csoverp95.nrecs === 0) {
						summary.csoverp95.firstidx = i;
					}	

					summary.csoverp95.nrecs++;
					summary.csoverp95.lastidx = i;
				}	

				if (item.pg_inout_sec > lastitem.pginout_p95) {
					if (summary.pgoverp95.nrecs === 0) {
						summary.pgoverp95.firstidx = i;
					}	

					summary.pgoverp95.nrecs++;
					summary.pgoverp95.lastidx = i;
				}	

				if (item.forks_sec > lastitem.fork_p95_sec) {
					if (summary.forkoverp95.nrecs === 0) {
						summary.forkoverp95.firstidx = i;
					}	

					summary.forkoverp95.nrecs++;
					summary.forkoverp95.lastidx = i;
				}	

				if ((item.cpuissue > 0) && (item.cpuissue < CpuIssueSource.length)) {
					const		sobj = summary.cpuissuesourcearr[item.cpuissue];

					if (sobj.nrecs === 0) {
						sobj.firstidx = i;
					}	

					sobj.nrecs++;
					sobj.lastidx = i;
				}	

				if ((item.memissue > 0) && (item.memissue < MemIssueSource.length)) {
					const		sobj = summary.memissuesourcearr[item.memissue];

					if (sobj.nrecs === 0) {
						sobj.firstidx = i;
					}	

					sobj.nrecs++;
					sobj.lastidx = i;
				}	
			}

			if (item.swap_inout_sec > 0) {
				if (summary.swapping.nrecs === 0) {
					summary.swapping.firstidx = i;
				}	

				summary.swapping.nrecs++;
				summary.swapping.lastidx = i;
			}	

			if (item.reclaim_stalls > 0) {
				if (summary.reclaims.nrecs === 0) {
					summary.reclaims.firstidx = i;
				}	

				summary.reclaims.nrecs++;
				summary.reclaims.lastidx = i;
			}	


			if (isaggregated === true) {

				summary.nrecs += item.inrecs;

				if (item.cpuissue > 0) {
					if (summary.cpubadsevere.nrecs === 0) {
						summary.cpubadsevere.firstidx = i;
					}	

					summary.cpubadsevere.nrecs += item.cpuissue;
					summary.cpubadsevere.lastidx = i;

					statemarker = true;

					if (item.incpusat > 0) {
						const		sobj = summary.cpuissuesourcearr[1];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.incoresat > 0) {
						const		sobj = summary.cpuissuesourcearr[2];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	


					if (item.iniowait > 0) {
						const		sobj = summary.cpuissuesourcearr[3];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	


					if (item.incs > 0) {
						const		sobj = summary.cpuissuesourcearr[4];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.infork > 0) {
						const		sobj = summary.cpuissuesourcearr[5];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	


					if (item.inrproc > 0) {
						const		sobj = summary.cpuissuesourcearr[6];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	
				}

				if (item.memissue > 0) {
					if (summary.membadsevere.nrecs === 0) {
						summary.membadsevere.firstidx = i;
					}	

					summary.membadsevere.nrecs += item.memissue;
					summary.membadsevere.lastidx = i;

					statemarker = true;

					if (item.inrsssat > 0) {
						const		sobj = summary.memissuesourcearr[1];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.incmmsat > 0) {
						const		sobj = summary.memissuesourcearr[2];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.inpginout > 0) {
						const		sobj = summary.memissuesourcearr[3];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.inswpinout > 0) {
						const		sobj = summary.memissuesourcearr[4];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.inreclaim > 0) {
						const		sobj = summary.memissuesourcearr[5];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.inoom > 0) {
						const		sobj = summary.memissuesourcearr[6];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	

					if (item.inswpspc > 0) {
						const		sobj = summary.memissuesourcearr[7];

						if (sobj.nrecs === 0) {
							sobj.firstidx = i;
						}	

						sobj.nrecs += item.inrecs;
						sobj.lastidx = i;
					}	
				}
			}	

			if (statemarker) {
				summary.statemarker.push(i);
			}	
		}	

		summary.starttime	= startmom.format();
		summary.endtime		= endmom.format();
	}
	catch(e) {
		console.log(`Exception occured while calculating summary : ${e}`);

		notification.error({message : "Data Summary Exception Error", description : `Exception occured while summarizing new data : ${e.message}`});
	}	
}	


export function CpuMemQuickFilters({filterCB, useHostFields})
{
	if (typeof filterCB !== 'function') return null;

	const onHost = (value) => {
		filterCB(`{ host like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onCluster = (value) => {
		filterCB(`{ host.cluster like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onBadCpu = () => {
		filterCB(`{ cpumem.cpu_state in 'Bad','Severe' }`);
	};	

	const onBadMem = () => {
		filterCB(`{ cpumem.mem_state in 'Bad','Severe' }`);
	};	

	const onCPUSatur = () => {
		filterCB(`{ cpumem.cpu_pct >= 80 }`);
	};	

	const onIOWait = () => {
		filterCB(`{ cpumem.cpuissue = 3 }`);
	};	

	const onCPUCS = () => {
		filterCB(`{ cpumem.cpuissue = 4 }`);
	};	

	const onHighPagingSwap = () => {
		filterCB(`{ cpumem.memissue in 3,4 }`);
	};	

	const onMemReclaim = () => {
		filterCB(`{ cpumem.reclaim_stalls > 0 }`);
	};	

	const onOOM = () => {
		filterCB(`{ cpumem.oom_kill > 0 }`);
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
	<span style={{ fontSize : 14 }}><i><strong>Host CPU State is Bad or Severe </strong></i></span>
	</div>

	<div style={{ width : 260, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onBadCpu} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host Memory State is Bad or Severe </strong></i></span>
	</div>

	<div style={{ width : 260, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onBadMem} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>CPU is Saturated (>= 80%) </strong></i></span>
	</div>

	<div style={{ width : 270, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onCPUSatur} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has High IO Waits </strong></i></span>
	</div>

	<div style={{ width : 270, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onIOWait} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has High Context Switches </strong></i></span>
	</div>

	<div style={{ width : 270, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onCPUCS} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has High Memory Paging or Swapping </strong></i></span>
	</div>

	<div style={{ width : 250, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onHighPagingSwap} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has Memory Reclaim Delays </strong></i></span>
	</div>

	<div style={{ width : 270, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onMemReclaim} size='small' >Set Filter</Button>
	</div>

	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Host has Out of Memory Process Kills </strong></i></span>
	</div>

	<div style={{ width : 250, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onOOM} size='small' >Set Filter</Button>
	</div>

	</div>
	</>


	</>
	);
}	

export function CpuMemMultiQuickFilter({filterCB, useHostFields = true, linktext, quicklinktext})
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
			title : <Title level={4}>CPU Memory Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={cpumemfields} useHostFields={useHostFields} title='CPU Memory Advanced Filters' />,
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
			title : <Title level={4}>CPU Memory Quick Filters</Title>,

			content : <CpuMemQuickFilters filterCB={onFilterCB} useHostFields={useHostFields} />,
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

export function CpuMemAggrFilter({filterCB, linktext})
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
			title : <Title level={4}>CPU Memory Aggregation Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={aggrcpumemfields} title='CPU Memory Aggregation Filters' />,
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

export function CpuMemModalCard({rec, parid, aggrMin, endtime, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	if (!rec) {
		throw new Error(`No Data record specified for CpuMem Modal`);
	}

	const			isaggr = (rec.inrecs !== undefined) ;

	if (isaggr && aggrMin === undefined) {
		aggrMin = 1;
	}	

	const			tstart = moment(rec.time, moment.ISO_8601).subtract(5, 'minute').format();
	const 			tend = getMinEndtime(rec.time, aggrMin ?? 1, endtime);
	const			newAggrMin = isaggr ? (moment(tend, moment.ISO_8601).unix() - moment(rec.time, moment.ISO_8601).unix())/60 + 1 : 0;

	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Host Info</strong></span>,
			content : <HostInfoDesc parid={parid ?? rec.parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getCpuMemTimeState = () => {
		const		tabKey = `CpuMemState_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Get CPU Memory State around record time</i></span>, 'CPU Memory State as per time',
				() => { return <CPUMemPage parid={parid} isRealTime={false} starttime={tstart} endtime={tend} 
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);
	};

	const getSvcStateTable = (linktext, filter, aggrfilter) => {
		return <Button type='dashed' onClick={() => {
			svcTableTab({parid, starttime : rec.time, endtime : tend, filter, aggrfilter, 
					useAggr : isaggr, aggrMin : newAggrMin, aggrType : 'sum', addTabCB, remTabCB, isActiveTabCB, isext : true, maxrecs : 10000, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter, aggrfilter) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({parid, starttime : rec.time, endtime : tend, filter, aggrfilter, 
					useAggr : isaggr, aggrMin : newAggrMin, aggrType : 'sum', addTabCB, remTabCB, isActiveTabCB, isext : true, maxrecs : 10000, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const getCpuMemHistoricalState = useCallback((date, dateString, useAggr, dateAggrMin, aggrType) => {
		if (!date || !dateString) {
			return;
		}

		let		istimepoint = true;

		if (safetypeof(date) === 'array') {
			if (date.length !== 2 || safetypeof(dateString) !== 'array' || false === date[0].isValid() || false === date[1].isValid()) {
				message.error(`Invalid Historical Date Range set...`);
				return;
			}	

			istimepoint = false;
		}
		else {
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				message.error(`Invalid Historical Date set ${dateString}...`);
				return;
			}	
		}

		const		tabKey = `CpuMemHist_${Date.now()}`;
		
		CreateTab('CPU Memory Historical',
			() => { return <CPUMemPage parid={parid} isRealTime={false} 
					starttime={istimepoint ? dateString : dateString[0]} endtime={istimepoint ? undefined : dateString[1]} 
					aggregatesec={!istimepoint && useAggr && dateAggrMin ? dateAggrMin * 60 : undefined}
					aggregatetype={!istimepoint && useAggr ? aggrType : undefined}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
					isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);

	}, [parid, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);

	const getCpuMemMonitor = () => {
		const		tabKey = `CpuMemMon_${Date.now()}`;
		
		return CreateLinkTab(<span><i>CPU Memory Monitor</i></span>, 'CPU Memory Realtime Monitor', 
					() => { return <CPUMemPage parid={parid} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};


	return (
		<>
		<ErrorBoundary>

		<div style={{ overflowX : 'auto', overflowWrap : 'anywhere', margin: 30, padding: 10, border: '1px groove #d9d9d9', maxHeight : 500 }} >
		<JSONDescription jsondata={rec} fieldCols={[...cpumemfields, ...aggrcpumemfields, ...hostfields]} titlestr={`${isaggr ? 'Aggregated ' : ''}CPU Memory Status`} column={3} />
		</div>

		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		{rec.parid && <Col span={8}> <Button type='dashed' onClick={getHostInfo} >Get Host '{rec.host}' Information</Button> </Col>}
		<Col span={8}> {getSvcStateTable('Get Services with Issues', `{ state in 'Bad','Severe' }`)} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getProcStateTable('Get Processes with Issues', `{ state in 'Bad','Severe' }`)} </Col>
		<Col span={8}>{getProcStateTable('Get Processes with CPU Delays', `{ cpudel > 0 }`)} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}>{getProcStateTable('Get Processes with Memory Delays', `{ vmdel > 0 }`)} </Col>
		<Col span={8}>{getProcStateTable('Get Processes with IO Delays', `{ iodel > 0 }`)} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> {getProcStateTable('Get Processes with CPU > 1%', isaggr ? undefined : '{ cpu > 1 }', '{ cpu > 1 }')} </Col>
		<Col span={8}> {getProcStateTable('Get Processes with Memory RSS > 10 MB', isaggr ? undefined : '{ rss > 10 }', '{ rss > 10 }')} </Col>

		</Row>



		<Row justify="space-between">

		<Col span={8}> {getCpuMemTimeState()} </Col>
		<Col span={8}> {getCpuMemMonitor()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> 
			<TimeRangeAggrModal onChange={getCpuMemHistoricalState} title={`Get Historical CPU Memory States`} 
					showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />
		</Col>			
		</Row>

		</Space>
		</div>

		</ErrorBoundary>

		</>
	);	
}

export function CpuMemSearch({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	const			isrange = (starttime !== undefined && endtime !== undefined) ? true : false;
	let			hinfo = null, closetab = 0;

	useEffect(() => {

		const conf = 
		{
			url 	: NodeApis.cpumem,
			method	: 'post',
			data : {
				starttime,
				endtime,
				parid,
				madfilterarr,
				options : {
					maxrecs 	: maxrecs,
					aggregate	: useAggr,
					aggrsec		: aggrMin ? aggrMin * 60 : 300,
					aggroper	: aggrType ?? 'sum',
					filter,
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
					
			return mergeMultiMadhava(apidata, "cpumem");
		};	

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		} 

		catch(e) {
			notification.error({message : "Data Fetch Exception Error for CPU Memory Table", 
					description : `Exception occured while waiting for CPU Memory Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for CPU Memory Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	
	}, [parid, aggrMin, aggrType, doFetch, endtime, madfilterarr, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					dataRowsCb(data.cpumem?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, dataRowsCb]);	

	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && Array.isArray(data.cpumem)) { 
			
			if (data.cpumem.length === 0) {
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
										title : <span><strong>CPU Memory</strong></span>,
										content : (
											<>
											<CpuMemModalCard rec={record} parid={parid ?? record.parid} aggrMin={useAggr && aggrMin ? aggrMin : undefined}
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
					else {
						tableOnRow = (record, rowIndex) => {
							return {
								onClick: event => {
									Modal.info({
										title : <span><strong>CPU Memory State</strong></span>,
										content : (
											<>
											<JSONDescription jsondata={record} column={3} />
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
				};

				let		columns, rowKey, newtitlestr, timestr;


				if (customColumns && customTableColumns) {
					columns = customTableColumns;
					rowKey = "rowid";
					newtitlestr = "CPU Memory State";
					timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong></span>;
				}
				else if (!isrange) {
					columns = parid ? hostCpuColumns : globCpuColumns;
					rowKey = parid ? "time" : ((record) => record.parid + record.time);

					if (parid) {
						newtitlestr = `CPU Memory State for Host ${hostname ?? ''}`;
					}	
					else {
						if (!name) {
							newtitlestr = 'Global CPU Memory State';
						}
						else {
							newtitlestr = `${name} CPU Memory State`;
						}	
					}	

					timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format("MMM Do YYYY HH:mm:ss Z")} </span>;
				}
				else {
					rowKey = parid ? "time" : ((record) => record.parid + record.time);

					if (parid) {
						newtitlestr = `${useAggr ? 'Aggregated ' : ''} CPU Memory State for Host ${hostname ?? ''}`;
						columns = !useAggr ? hostCpuColumns : hostAggrCpuColumns(aggrType);
					}
					else {
						columns = !useAggr ? globCpuColumns : globAggrCpuColumns(aggrType);
						newtitlestr = `${useAggr ? 'Aggregated ' : ''} ${name ? name : 'Global'} CPU Memory State`;
					}	
					timestr = <span style={{ fontSize : 14 }} ><strong> for time range {moment(starttime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")} to {moment(endtime, moment.ISO_8601).format("MMM Do YYYY HH:mm:ss Z")}</strong></span>;
				}	

				hinfo = (
					<>
					<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
					<Title level={4}>{titlestr ?? newtitlestr}</Title>
					{timestr}
					<div style={{ marginBottom: 30 }} />
					<GyTable columns={columns} onRow={tableOnRow} dataSource={data.cpumem} rowKey={rowKey} scroll={getTableScroll()} />
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

export function cpumemTableTab({parid, hostname, starttime, endtime, useAggr, aggrMin, aggrType, filter, aggrfilter, name, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title,
					madfilterarr, titlestr, customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "CPU Memory Query", description : `Invalid starttime specified for CPU Memory : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "CPU Memory Query", description : `Invalid endtime specified for CPU Memory : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "CPU Memory Query", description : `Invalid endtime specified for CPU Memory : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? CpuMemSearch;
	let				tabKey;

	const getComp = () => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp parid={parid} starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} name={name} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} hostname={hostname} customColumns={customColumns} customTableColumns={customTableColumns} madfilterarr={madfilterarr}
						titlestr={titlestr} sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={CpuMemSearch} /> 
					</>	
				);
			};

	if (!modal) {
		const			tabKey = `CpuMem_${Date.now()}`;

		CreateTab(title ?? "CPU Memory", getComp, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "CPU Memory",

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

function CpuMemSummary({objref, isRealTime, aggregatesec, aggroper, modalCount, timeSliderIndex, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const 			summary = objref.current.summary;	
	const			isaggregated = (aggregatesec !== undefined);
	const			avgstr = (isaggregated ? "Aggr " : "");

	const title = (<div style={{ textAlign : 'center' }}><Title level={4}>CPU Memory Summary for Host <em>{summary.hostname}</em></Title></div>);

	let 			lastitem = null, ismid = false;
	
	if (summary.dataarr && safetypeof(summary.dataarr) === 'array' && summary.dataarr.length > 0) {
		if (timeSliderIndex >= 0 && (timeSliderIndex < summary.dataarr.length)) {
			lastitem = summary.dataarr[timeSliderIndex];
			ismid = true;
		}	
		else {
			lastitem = summary.dataarr[summary.dataarr.length - 1];
		}
	}	

	let			ltime, endtime;

	if (lastitem && lastitem.time) {
		ltime = `Statistics at time ${lastitem.time}`;
		endtime = lastitem.time;
	}	
	else {
		ltime = 'Last Seen Statistics';
	}	

	const getHostInfo = () => {
		Modal.info({
			title : <span><strong>Service Host Info</strong></span>,
			content : (
				<>
				<ComponentLife stateCB={modalCount} />
				<HostInfoDesc parid={summary.parid}  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				</>
			),

			width : '90%',	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,
		});
	};	

	const getProcStateTable = (linktext, filter, tstart, tend) => {
		return <Button type='dashed' onClick={() => {
			procTableTab({parid : summary.parid, starttime : tstart, endtime : tend, filter, name : `Host ${summary.hostname}`, maxrecs : 10000,
					addTabCB, remTabCB, isActiveTabCB, isext : true, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const tableOnRow = (record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Host {record.host} CPU Memory State</strong></span>,
					content : (
						<>
						<CpuMemModalCard rec={record} parid={record.parid ?? summary.parid} endtime={endtime}
							aggrMin={aggregatesec >= 60 ? aggregatesec/60 : 1} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
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

	const createLinkModal = (linktext, desc, filt, firstidx, lastidx, nrecs, extraelemcb) => {

		const modonclick = () => {
			Modal.info({
				title : <div style={{ textAlign : 'center' }}>{<em>{desc}</em> }</div>,

				content : (
					<>
					{typeof extraelemcb === 'function' && ( <div style={{ marginBottom : 30 }}> {extraelemcb()} </div>)}
					<GyTable columns={isaggregated ? hostAggrCpuColumns(aggroper) : hostCpuColumns} onRow={tableOnRow} 
							dataSource={arrayFilter(filt, summary.dataarr, firstidx, lastidx, nrecs)} 
							rowKey={((record) => record.host + record.time)} scroll={getTableScroll()} />
					</>
					),

				width : '90%',	
				closable : true,
				destroyOnClose : true,
				maskClosable : true,
			});
		};	
		
		return <Button type='dashed' onClick={typeof filt === 'function' ? modonclick : undefined} >{linktext}</Button>;
	};


	const lasttitle = (<div style={{ textAlign : 'center', marginTop: 20 }}><span style={{ fontSize: 16 }}> 
				<em><strong>Time Range {aggregatesec ? `${aggregatesec/60} min ${aggroper} Aggregated` : ""} {ltime}</strong></em></span></div>);

	return (
		<>
		<Descriptions title={title} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em>First Record Time</em>}>
				<span style={{ fontSize: 14 }}><em>{summary.starttime}</em></span>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Last Record Time</em>}>
				<span style={{ fontSize: 14 }}><em>{summary.endtime}</em></span>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># {isaggregated ? "Individual " : ""} Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.nrecs} />
			</Descriptions.Item>

			{isaggregated &&
			<Descriptions.Item 
				label={<em># Aggregated Records </em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.naggrrecs} />
			</Descriptions.Item>
			}

			<Descriptions.Item label={<em>Host Info</em>}> <Button type='dashed' onClick={getHostInfo} >Get Host Information</Button> </Descriptions.Item>

			<Descriptions.Item label={<em>Cluster Name</em>}> <span style={{ fontSize: 14 }}><em>{summary.clustername}</em></span> </Descriptions.Item>

			<Descriptions.Item 
				label={<em># Bad States</em>}>
				<Space>
				{summary.cpubadsevere.nrecs > 0 ? createLinkModal((
					<>
					{CreateRectSvg('red')}
					<span style={{ fontSize: 14 }}><em>&nbsp; {summary.cpubadsevere.nrecs} </em></span>
						{!isTabletOrMobile && <span style={{ fontSize: 12 }}><em>&nbsp; / {summary.nrecs}</em></span>}
					</>
					), 'CPU Issue', 
					(item) => (item.cpu_state === 'Bad' || item.cpu_state === 'Severe' || item.cpuissue > 0), 
					summary.cpubadsevere.firstidx, summary.cpubadsevere.lastidx + 1, summary.cpubadsevere.nrecs,
					) : `0 / ${summary.nrecs}`}
				
				<span>    </span>

				{summary.membadsevere.nrecs > 0 ? createLinkModal((
					<>
					{CreateCircleSvg('red')}
					<span style={{ fontSize: 14 }}><em>&nbsp; {summary.membadsevere.nrecs} </em></span>
						{!isTabletOrMobile && <span style={{ fontSize: 12 }}><em>&nbsp; / {summary.nrecs}</em></span>}
					</>
					), 'Memory Issue', 
					(item) => (item.mem_state === 'Bad' || item.mem_state === 'Severe' || item.memissue > 0), 
					summary.membadsevere.firstidx, summary.membadsevere.lastidx + 1, summary.membadsevere.nrecs,
					) : `0 / ${summary.nrecs}`}

				</Space>
			</Descriptions.Item>

			{!isaggregated && 
			<Descriptions.Item 
				label={<em># over p95 CPU</em>}>
				{summary.cpuoverp95.nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuoverp95.nrecs} />
					), 'CPU over p95 %', 
					(item) => (item.cpu_pct > lastitem?.cpu_p95), summary.cpuoverp95.firstidx, summary.cpuoverp95.lastidx + 1, summary.cpuoverp95.nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get All Processes with Issues', `{ state in 'Bad','Severe' }`,
							summary.dataarr[summary.cpuoverp95.firstidx]?.time, summary.dataarr[summary.cpuoverp95.lastidx]?.time)}
						{getProcStateTable('Get Processes with CPU > 1%', `{ cpu > 1 }`,
							summary.dataarr[summary.cpuoverp95.firstidx]?.time, summary.dataarr[summary.cpuoverp95.lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}				
			</Descriptions.Item>
			}

			{!isaggregated && 
			<Descriptions.Item 
				label={<em># over p95 Context Switches</em>}>
				{summary.csoverp95.nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.csoverp95.nrecs} />
					), 'Context Switches over p95', 
					(item) => (item.cs_sec > lastitem?.cs_p95_sec), summary.csoverp95.firstidx, summary.csoverp95.lastidx + 1, summary.csoverp95.nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get All Processes with Issues', `{ state in 'Bad','Severe' }`,
							summary.dataarr[summary.csoverp95.firstidx]?.time, summary.dataarr[summary.csoverp95.lastidx]?.time)}
						{getProcStateTable('Get Processes with CPU Delays', `{ cpudel > 0 }`,
							summary.dataarr[summary.csoverp95.firstidx]?.time, summary.dataarr[summary.csoverp95.lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}				

			</Descriptions.Item>
			}

			{!isaggregated && 
			<Descriptions.Item 
				label={<em># over p95 Memory Paging</em>}>
				{summary.pgoverp95.nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.pgoverp95.nrecs} />
					), 'PageIn/Out over p95', 
					(item) => (item.pg_inout_sec > lastitem?.pginout_p95), summary.pgoverp95.firstidx, summary.pgoverp95.lastidx + 1, summary.pgoverp95.nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get All Processes with Issues', `{ state in 'Bad','Severe' }`,
							summary.dataarr[summary.pgoverp95.firstidx]?.time, summary.dataarr[summary.pgoverp95.lastidx]?.time)}
						{getProcStateTable('Get Processes with Memory or IO Delays', `{ vmdel > 0 } or { iodel > 0 }`,
							summary.dataarr[summary.pgoverp95.firstidx]?.time, summary.dataarr[summary.pgoverp95.lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}

			</Descriptions.Item>
			}

			{!isaggregated && 
			<Descriptions.Item 
				label={<em># over p95 Process Creation</em>}>
				<>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.forkoverp95.nrecs} />
				</>

			</Descriptions.Item>
			}

			{summary.cpuissuesourcearr[1] && summary.cpuissuesourcearr[1].nrecs && 
			<Descriptions.Item 
				label={<em># CPU Saturated</em>}>
				{summary.cpuissuesourcearr[1].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuissuesourcearr[1].nrecs} />
					), 'CPU Saturated', 
					(item) => ((!isaggregated && item.cpuissue === 1) || (isaggregated && item.incpusat > 0)), 
						summary.cpuissuesourcearr[1].firstidx, summary.cpuissuesourcearr[1].lastidx + 1, summary.cpuissuesourcearr[1].nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get Processes with CPU > 1%', `{ cpu > 1 }`,
							summary.dataarr[summary.cpuissuesourcearr[1].firstidx]?.time, summary.dataarr[summary.cpuissuesourcearr[1].lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}

			</Descriptions.Item>
			}

			{summary.cpuissuesourcearr[2] && summary.cpuissuesourcearr[2].nrecs && 
			<Descriptions.Item 
				label={<em># Cores Saturated</em>}>
				{summary.cpuissuesourcearr[2].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuissuesourcearr[2].nrecs} />
					), 'CPU Core Saturated', 
					(item) => ((!isaggregated && item.cpuissue === 2) || (isaggregated && item.incoresat > 0)), 
						summary.cpuissuesourcearr[2].firstidx, summary.cpuissuesourcearr[2].lastidx + 1, summary.cpuissuesourcearr[2].nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get Processes with CPU > 1%', `{ cpu > 1 }`,
							summary.dataarr[summary.cpuissuesourcearr[2].firstidx]?.time, summary.dataarr[summary.cpuissuesourcearr[2].lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}				
			</Descriptions.Item>
			}

			{summary.cpuissuesourcearr[3] && summary.cpuissuesourcearr[3].nrecs && 
			<Descriptions.Item 
				label={<em># IO Wait Issues</em>}>
				{summary.cpuissuesourcearr[3].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuissuesourcearr[3].nrecs} />
					), 'IO Wait Issues', 
					(item) => ((!isaggregated && item.cpuissue === 3) || (isaggregated && item.iniowait > 0)), 
						summary.cpuissuesourcearr[3].firstidx, summary.cpuissuesourcearr[3].lastidx + 1, summary.cpuissuesourcearr[3].nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get Processes with IO Delays', `{ iodel > 0 }`,
							summary.dataarr[summary.cpuissuesourcearr[3].firstidx]?.time, summary.dataarr[summary.cpuissuesourcearr[3].lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}
			</Descriptions.Item>
			}

			{summary.cpuissuesourcearr[4] && summary.cpuissuesourcearr[4].nrecs && 
			<Descriptions.Item 
				label={<em># Context Switch Issues</em>}>
				{summary.cpuissuesourcearr[4].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuissuesourcearr[4].nrecs} />
					), 'Context Switch Issues', 
					(item) => ((!isaggregated && item.cpuissue === 4) || (isaggregated && item.incs > 0)), 
						summary.cpuissuesourcearr[4].firstidx, summary.cpuissuesourcearr[4].lastidx + 1, summary.cpuissuesourcearr[4].nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get Processes with CPU Delays', `{ cpudel > 0 }`,
							summary.dataarr[summary.cpuissuesourcearr[4].firstidx]?.time, summary.dataarr[summary.cpuissuesourcearr[4].lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}				

			</Descriptions.Item>
			}

			{summary.cpuissuesourcearr[5] && summary.cpuissuesourcearr[5].nrecs && 
			<Descriptions.Item 
				label={<em># High New Processes Issues</em>}>
				<>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuissuesourcearr[5].nrecs} />
				</>
			</Descriptions.Item>
			}

			{summary.cpuissuesourcearr[6] && summary.cpuissuesourcearr[6].nrecs && 
			<Descriptions.Item 
				label={<em># High Runnable Processes</em>}>
				<>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.cpuissuesourcearr[6].nrecs} />
				</>
			</Descriptions.Item>
			}

			{summary.memissuesourcearr[1] && summary.memissuesourcearr[1].nrecs && 
			<Descriptions.Item 
				label={<em># Resident Memory Saturated</em>}>
				{summary.memissuesourcearr[1].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissuesourcearr[1].nrecs} />
					), 'Resident Memory RSS Saturated', 
					(item) => ((!isaggregated && item.memissue === 1) || (isaggregated && item.inrsssat > 0)), 
						summary.memissuesourcearr[1].firstidx, summary.memissuesourcearr[1].lastidx + 1, summary.memissuesourcearr[1].nrecs,
					)					
					: 0}
			</Descriptions.Item>
			}

			{summary.memissuesourcearr[2] && summary.memissuesourcearr[2].nrecs && 
			<Descriptions.Item 
				label={<em># Commit Memory Saturated</em>}>
				{summary.memissuesourcearr[2].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissuesourcearr[2].nrecs} />
					), 'Commit Memory Saturated', 
					(item) => ((!isaggregated && item.memissue === 2) || (isaggregated && item.incmmsat > 0)), 
						summary.memissuesourcearr[2].firstidx, summary.memissuesourcearr[2].lastidx + 1, summary.memissuesourcearr[2].nrecs,
					)					
					: 0}
			</Descriptions.Item>
			}

			{summary.memissuesourcearr[3] && summary.memissuesourcearr[3].nrecs && 
			<Descriptions.Item 
				label={<em># High Page In/Outs</em>}>
				{summary.memissuesourcearr[3].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissuesourcearr[3].nrecs} />
					), 'Page In/Out Issues', 
					(item) => ((!isaggregated && item.memissue === 3) || (isaggregated && item.inpginout > 0)), 
						summary.memissuesourcearr[3].firstidx, summary.memissuesourcearr[3].lastidx + 1, summary.memissuesourcearr[3].nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get Processes with Memory / IO Delays', `{ vmdel > 0 } or { iodel > 0}`,
							summary.dataarr[summary.memissuesourcearr[3].firstidx]?.time, summary.dataarr[summary.memissuesourcearr[3].lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}
			</Descriptions.Item>
			}

			{summary.memissuesourcearr[4] && summary.memissuesourcearr[4].nrecs && 
			<Descriptions.Item 
				label={<em># Page Swapping</em>}>
				{summary.memissuesourcearr[4].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissuesourcearr[4].nrecs} />
					), 'Swap In/Out Issues', 
					(item) => ((!isaggregated && item.memissue === 4) || (isaggregated && item.inswpinout > 0)), 
						summary.memissuesourcearr[4].firstidx, summary.memissuesourcearr[4].lastidx + 1, summary.memissuesourcearr[4].nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get Processes with Memory / IO Delays', `{ vmdel > 0 } or { iodel > 0}`,
							summary.dataarr[summary.memissuesourcearr[4].firstidx]?.time, summary.dataarr[summary.memissuesourcearr[4].lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}
			</Descriptions.Item>
			}

			{summary.memissuesourcearr[5] && summary.memissuesourcearr[5].nrecs && 
			<Descriptions.Item 
				label={<em># Memory Reclaim Stalls</em>}>
				{summary.memissuesourcearr[5].nrecs > 0 ? createLinkModal((
					<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissuesourcearr[5].nrecs} />
					), 'Memory Reclaim Issues', 
					(item) => ((!isaggregated && item.memissue === 5) || (isaggregated && item.inreclaim > 0)), 
						summary.memissuesourcearr[5].firstidx, summary.memissuesourcearr[5].lastidx + 1, summary.memissuesourcearr[5].nrecs,
					() => (
						<>
						<Space>
						{getProcStateTable('Get Processes with Memory / IO Delays', `{ vmdel > 0 } or { iodel > 0}`,
							summary.dataarr[summary.memissuesourcearr[5].firstidx]?.time, summary.dataarr[summary.memissuesourcearr[5].lastidx]?.time)}					
						</Space>
						</>
						))					
					: 0}
			</Descriptions.Item>
			}

			{summary.memissuesourcearr[6] && summary.memissuesourcearr[6].nrecs && 
			<Descriptions.Item 
				label={<em># Out of Memory OOM kills</em>}>
				<>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissuesourcearr[6].nrecs} />
				</>
			</Descriptions.Item>
			}

			{summary.memissuesourcearr[7] && summary.memissuesourcearr[7].nrecs && 
			<Descriptions.Item 
				label={<em># Low Free Swap Space</em>}>
				<>
				<Statistic valueStyle={{ fontSize: 16 }} value={summary.memissuesourcearr[7].nrecs} />
				</>
			</Descriptions.Item>
			}

		</Descriptions>

		{
			lastitem && (

			<Descriptions title={lasttitle} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >

			<Descriptions.Item 
				label={<em>{!ismid && `Last`} {avgstr} Host State</em>}>
				<Space>

				{CreateRectSvg(getStateColor(lastitem.cpu_state))}
				<span> CPU {lastitem.cpu_state} </span>

				<span>     </span>

				{CreateCircleSvg(getStateColor(lastitem.mem_state))}
				<span> Memory {lastitem.mem_state} </span>


				</Space>
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>CPU</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(".0f")(lastitem.cpu_pct)} 
					suffix={<><span> %</span><span style={{ fontSize: 10 }}>{!isaggregated && <em> p95 {lastitem.cpu_p95}</em>}</span></>} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} All cores CPU</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(".0f")(lastitem.cumul_cpu_pct)} suffix="%" />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Memory Resident RSS</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(".0f")(lastitem.rss_pct)}
					suffix={<><span> %</span><span style={{ fontSize: 10 }}>{!isaggregated && <em> p95 {lastitem.rss_pct_p95}</em>}</span></>} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Context Switches</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.cs_sec)} 
					suffix=<span style={{ fontSize: 10 }}>{!isaggregated && <em>  p95 {format(",")(lastitem.cs_p95_sec)} </em>}</span> />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} New Processes/sec</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={lastitem.forks_sec} 
					suffix=<span style={{ fontSize: 10 }}>{!isaggregated && <em>  p95 {lastitem.fork_p95_sec}</em>}</span> />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>{avgstr} Runnable Processes</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={lastitem.procs} 
					suffix=<span style={{ fontSize: 10 }}>{!isaggregated && <em>  p95 {lastitem.procs_p95}</em>}</span> />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Page InOuts /sec</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.pg_inout_sec)} 
					suffix=<span style={{ fontSize: 10 }}>{!isaggregated && <em>  p95 {format(",")(lastitem.pginout_p95)}</em>}</span> />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Swap InOuts /sec</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={format(",")(lastitem.swap_inout_sec)} 
					suffix=<span style={{ fontSize: 10 }}>{!isaggregated && <em>  p95 {format(",")(lastitem.swpinout_p95)}</em>}</span> />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Memory Reclaim Stalls</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={lastitem.reclaim_stalls} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Major Page Faults</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={lastitem.pgmajfault} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Free Swap Space</em>}>
				<Statistic valueStyle={{ fontSize: 16 }} value={MBStrFormat(lastitem.swap_free_mb)} />
			</Descriptions.Item>

			{!isaggregated && 
			<Descriptions.Item 
				label={<em>Analysis of CPU State</em>} span={2}>
				<span style={{ fontSize: 14 }}><em>{lastitem.cpu_state_str}</em></span> 
			</Descriptions.Item>
			}

			{!isaggregated && 
			<Descriptions.Item 
				label={<em>Analysis of Memory State</em>} span={2}>
				<span style={{ fontSize: 14 }}><em>{lastitem.mem_state_str}</em></span> 
			</Descriptions.Item>
			}

			</Descriptions>
			)
		}	

		</>

	);		
}	


export function CPUMemPage({parid, isRealTime, starttime, endtime, aggregatesec, aggregatetype, addTabCB, remTabCB, isActiveTabCB, tabKey})
{
	const 		objref = useRef(null);
	const		cpuRef = useRef(null), csRef = useRef(null), pgSwapRef = useRef(null), forkProcRef = useRef(null), faultStallRef = useRef(null), rssOOMRef = useRef(null);

	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[realtimePaused, setrealtimePaused] = useState(false);
	const		[isaggregated, ] = useState(aggregatesec ? aggregatesec >= 2 * realtimesec : false);
	const		[aggroper, ] = useState(aggregatetype ?? "avg");
	const		[fetchIntervalmsec, ] = useState((isaggregated ? aggregatesec * 1000 : realtimesec * 1000));
	const		[timeSliderIndex, setTimeSlider] = useState(null);
	
	const 		isTabletOrMobile = useMediaQuery({ maxWidth: 1224 });

	if (objref.current === null) {
		console.log(`CPUMemPage initializing for first time : isRealTime=${isRealTime} starttime=${starttime} endtime=${endtime} aggregatesec=${aggregatesec} aggregatetype=${aggregatetype}`);

		objref.current = {
			isstarted 		: false,
			niter			: 0,
			isdrilldown		: false,
			updtracker		: null,
			nextfetchtime		: Date.now(),
			lastpausetime		: '',
			pauserealtime		: false,
			resumerealtime		: false,
			modalCount		: 0,
			prevdata		: null,
			prevdatastart		: null,
			prevsummary		: null,
			prevcharts		: null,
			timeSliderIndex		: null,
			sliderTimer		: null,
			maxSlider		: 0,
		};	

		objref.current[cpuTitle] 		= new ChartInfo(cpuTitle, cpuColumns); 	
		objref.current[csTitle] 		= new ChartInfo(csTitle, csColumns); 	
		objref.current[pgSwapTitle] 		= new ChartInfo(pgSwapTitle, pgSwapColumns); 	
		objref.current[forkProcTitle] 		= new ChartInfo(forkProcTitle, forkProcColumns); 	
		objref.current[faultStallTitle] 	= new ChartInfo(faultStallTitle, faultStallColumns); 	
		objref.current[rssOOMTitle] 		= new ChartInfo(rssOOMTitle, rssOOMColumns); 	

		objref.current.realtimearray	=	[];

		objref.current.summary = {
			hostname		: '',
			parid			: parid,
			clustername		: '',
			dataarr			: null,
		};	

		initSummary(objref.current.summary);
	}

	useEffect(() => {
		return () => {
			console.log(`CPUMemPage destructor called...`);
		};	
	}, []);

	const validProps = useMemo(() => {	

		if (!parid) {
			throw new Error(`Mandatory parid not specified`);
		}

		if (!isRealTime) {
			if (!starttime || !endtime) {
				throw new Error(`Mandatory Parameters starttime / endtime not specified`);
			}	

			if (false === moment(starttime, moment.ISO_8601).isValid()) {
				throw new Error(`Invalid starttime specified : ${starttime}`);
			}	

			if (false === moment(endtime, moment.ISO_8601).isValid()) {
				throw new Error(`Invalid endtime specified : ${endtime}`);
			}	
		}	

		return true;
	}, [parid, isRealTime, starttime, endtime]);	

	if (validProps === false) {
		// This should not occur
		throw new Error(`Internal Error : CPU Memory validProps check failed`);
	}	

	const modalCount = useCallback((isup) => {
		if (isup === true) {
			objref.current.modalCount++;
		}	
		else if (isup === false && objref.current.modalCount > 0) {
			objref.current.modalCount--;
		}	
	}, [objref]);	

	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		conf, currtime = Date.now(), isstart = false;

				if (currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted)) {
					return;
				}

				if (isRealTime) {
					let		isact = true;

					if (tabKey && typeof isActiveTabCB === 'function') {
						isact = isActiveTabCB(tabKey);
					}

					if (objref.current.resumerealtime === true) {
						if (cpuRef && cpuRef.current) {
							cpuRef.current.setResetZoom();
						}	

						objref.current.resumerealtime 	= false;
						objref.current.pauserealtime	= false;
					}	
					else if (objref.current.isdrilldown || (false === isact) || (objref.current.timeSliderIndex !== null) || (objref.current.modalCount > 0) ||
						(objref.current.pauserealtime === true)) {

						if (objref.current.lastpausetime === '') {
							objref.current.lastpausetime = moment().format();
							setrealtimePaused(true);
						}	

						return;
					}	
				}

				conf = { 
					url 		: NodeApis.cpumem, 
					method 		: 'post', 
					data 		: { 
						parid 		: parid,
						timeoutsec 	: isRealTime && !isaggregated ? 10 : 100,
						options		: {
							aggregate	: isaggregated, 
							aggrsec		: isaggregated ? aggregatesec : undefined,
							aggroper	: aggroper,
							sortcolumns	: isaggregated ? [ "time" ] : undefined,
						},	
						timeoffsetsec	: isRealTime && isaggregated ? aggregatesec : undefined,
					}, 
					timeout 	: isRealTime && !isaggregated ? 10000 : 100000,
				};

				if (false === isRealTime) {
					conf.data.starttime = moment(starttime, moment.ISO_8601).format();
					conf.data.endtime = moment(endtime, moment.ISO_8601).format();

					isstart = true;
				}
				else {
					const mintime = Date.now() - fetchIntervalmsec * (fixedArraySize - 1);
					
					if (objref.current.isstarted === false) {
						isstart = true;
						
						conf.data.starttime = moment(mintime).format();
						conf.data.endtime = moment().format();
					}
					else {
						if ((objref.current.lastpausetime.length === 25 /* moment().format().length */) || (objref.current.lastpausetime.length === 20 /* UTC */)) {
							const mobj = moment(objref.current.lastpausetime, moment.ISO_8601);

							if (mobj.isValid() && +mobj >= mintime) {
								conf.data.starttime = objref.current.lastpausetime;
							}
							else {
								conf.data.starttime = moment(mintime).format();
							}	

							conf.data.endtime = moment().format();
						}	
					}	
				}

				console.log(`Fetching next interval data...for config ${JSON.stringify(conf)}`);

				setApiData({data : [], isloading : true, isapierror : false});

				let 		res = await axios(conf);

				if (isRealTime) {
					objref.current.nextfetchtime = Date.now() + fetchIntervalmsec;
				}
				else {
					objref.current.nextfetchtime = 0;
				}	

				if (objref.current.lastpausetime.length) {
					objref.current.lastpausetime = '';
					setrealtimePaused(false);
				}

				validateApi(res.data);
				
				if (safetypeof(res.data) === 'array') { 
					setApiData({data : res.data, isloading : false, isapierror : false});
				}
				else {
					setApiData({data : [], isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during CPU Memory Data fetch..."});
				}	

				if (isstart) {
					objref.current.isstarted = true;
				}	

			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				objref.current.nextfetchtime = Date.now() + 30000;
			}	
			finally {
				timer1 = setTimeout(apiCall, 1000);
			}
		}, 0);

		return () => { 
			console.log(`Destructor called for CPUMemPage setinterval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, parid, isRealTime, starttime, endtime, fetchIntervalmsec, aggroper, aggregatesec, isaggregated, tabKey, isActiveTabCB, cpuRef]);	
	
	const cpuRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!cpuRef.current) return;

					const			tref = cpuRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ state in 'Bad','Severe' }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes with Issues</Button>
			
			<Button onClick={() => {
					if (!cpuRef.current) return;

					const			tref = cpuRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	'{ cpu > 1 }',
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes with Avg CPU > 1%</Button>

			</Space>
			</>
		);
	}, [cpuRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const csRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!csRef.current) return;

					const			tref = csRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ cpudel > 0 }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes with CPU Delays</Button>
			
			<Button onClick={() => {
					if (!csRef.current) return;

					const			tref = csRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrfilter 	:	'{ invcsw + inivcsw > 0 }',
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes Degraded by Context Switches</Button>

			</Space>
			</>
		);
	}, [csRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const pgSwapRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!pgSwapRef.current) return;

					const			tref = pgSwapRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ vmdel > 0 } or { iodel > 0 }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes with Memory/Block IO Delays</Button>
			
			<Button onClick={() => {
					if (!pgSwapRef.current) return;

					const			tref = pgSwapRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrfilter 	:	'{ inswpdel + inrecdel + inthrdel + inpgflt > 0 }',
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes Degraded by Memory Issues</Button>

			</Space>
			</>
		);
	}, [pgSwapRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	


	const forkProcRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!forkProcRef.current) return;

					const			tref = forkProcRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ state in 'Bad','Severe' }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes with Issues</Button>
			
			<Button onClick={() => {
					if (!forkProcRef.current) return;

					const			tref = forkProcRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	'{ cpudel > 0 }',
						aggrfilter 	:	'{ incpudel > 0 }',
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes Degraded by CPU Delays</Button>

			</Space>
			</>
		);
	}, [forkProcRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const faultStallRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!faultStallRef.current) return;

					const			tref = faultStallRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrfilter 	:	'{ inswpdel + inrecdel + inthrdel + inpgflt > 0 }',
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes Degraded by Memory Issues</Button>

			</Space>
			</>
		);
	}, [faultStallRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const rssOOMRescaleComps = useMemo(() => {
		return (
			<>
			<Space style={{ marginLeft: 10 }}>

			<Button onClick={() => {
					if (!rssOOMRef.current) return;

					const			tref = rssOOMRef;

					procTableTab({
						parid,
						starttime 	:	moment(tref.current.getRescaleTimerange()[0]).format(), 
						endtime 	:	moment(tref.current.getRescaleTimerange()[1]).format(),
						filter 		:	`{ rss > 10 }`,
						useAggr		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0] > 60000),
						aggrType	:	'sum',
						aggrMin		:	(+tref.current.getRescaleTimerange()[1] - +tref.current.getRescaleTimerange()[0])/60000 + 1,
						isext 		: 	true,
						name 		: 	`Host ${objref.current?.summary.hostname}`,
						addTabCB,
						remTabCB,
						isActiveTabCB,
						wrapComp 	: SearchWrapConfig,
					})}} >Processes with Memory RSS > 10 MB</Button>
			
			</Space>
			</>
		);
	}, [rssOOMRef, objref, parid, addTabCB, remTabCB, isActiveTabCB]);	

	const onRescaleComps = useCallback((title, isrescale) => {

		console.log(`title = ${title} onRescaleComps : isrescale = ${isrescale}`);

		objref.current.isdrilldown = isrescale;

		if (isrescale === false) {
			return null;
		}	

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		switch (title) {

			case cpuTitle 		: return cpuRescaleComps;

			case csTitle 		: return csRescaleComps;

			case pgSwapTitle	: return pgSwapRescaleComps;

			case forkProcTitle 	: return forkProcRescaleComps;

			case faultStallTitle	: return faultStallRescaleComps;
			
			case rssOOMTitle	: return rssOOMRescaleComps;

			default			: return null;
		}
	}, [objref, cpuRescaleComps, csRescaleComps, forkProcRescaleComps, pgSwapRescaleComps, rssOOMRescaleComps, faultStallRescaleComps]);

	const getRefFromTitle = useCallback((title) => {
		switch (title) {
			
			case cpuTitle 		:	return cpuRef;

			case csTitle		:	return csRef;

			case pgSwapTitle	:	return pgSwapRef;

			case forkProcTitle	: 	return forkProcRef;

			case faultStallTitle	: 	return faultStallRef;

			case rssOOMTitle	: 	return rssOOMRef;

			default			:	return null;
		};	

	}, [cpuRef, csRef, pgSwapRef, forkProcRef, faultStallRef, rssOOMRef]);	

	const timeRangeCB = useCallback((title, newtimerange) => {

		console.log(`title = ${title} New Timerange CB : newtimerange = ${newtimerange}`);

		const		chartinfo = objref.current[title];

		if (!chartinfo) return null;

		[cpuTitle, csTitle, pgSwapTitle, forkProcTitle, faultStallTitle, rssOOMTitle].forEach((item) => {
			if (item !== title) {
				const		ref = getRefFromTitle(item);

				if (ref && ref.current) {
					ref.current.setNewTimeRange(newtimerange);
				}
			}	
		});	

	}, [getRefFromTitle]);

	const timeTrackerCB = useCallback((newdate) => {

		[cpuTitle, csTitle, pgSwapTitle, forkProcTitle, faultStallTitle, rssOOMTitle].forEach((item) => {
			const		ref = getRefFromTitle(item);

			if (ref && ref.current) {
				ref.current.setNewTimeTracker(newdate);
			}
		});	

	}, [getRefFromTitle]);

	useEffect(() => {
		if (objref && objref.current && objref.current.updtracker) {
			timeTrackerCB(new Date(objref.current.updtracker));
			objref.current.updtracker = null;
		}	
	}, [objref, timeTrackerCB]);	

	const onTimeSliderChange = useCallback((newindex) => {
		if (objref && objref.current && objref.current.prevdatastart && objref.current.prevdatastart.length > newindex) {
			setTimeSlider(newindex);
			objref.current.timeSliderIndex = newindex;
			objref.current.updtracker = objref.current.prevdatastart[objref.current.prevdatastart.length - 1].time;
		}
	}, [objref]);

	const onTimeSliderAfterChange = useCallback(() => {
		if (objref && objref.current && objref.current.prevdata) {
			if (objref.current.sliderTimer) {
				clearTimeout(objref.current.sliderTimer);
			}

			objref.current.sliderTimer = setTimeout(() => {
				setTimeSlider(null);
				objref.current.timeSliderIndex = null;
			}, 15000);
		}
	}, [objref]);

	const getCpuChart = useCallback(() =>
	{
		const		cobj = objref.current[cpuTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];
		const		baseval = cobj1.baseline_, base5min = cobj1.baseline2_;
		const 		baselineArray = [{label : "Overall p95 CPU", value : baseval, yaxis : 1 }];

		if (Math.abs(baseval - base5min >= 10)) {
			baselineArray.push({label : "5 min p95 CPU", value : base5min, yaxis : 1, position : "right" });
		}	

		const scatterArray = getScatterArray(cpuColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={cpuRef} chartTitle={cpuTitle} columnInfoArr={cpuColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="CPU %" y1AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [onRescaleComps, timeRangeCB]);	


	const getCSChart = useCallback(() =>
	{
		const		cobj = objref.current[csTitle];
		
		if (!cobj || !cobj.chartobj_[0].timeseries_) {
			return null;
		}	

		const		cobj1 = cobj.chartobj_[0];
		const		baseval = cobj1.baseline_, base5min = cobj1.baseline2_;
		const 		baselineArray = [{label : "Overall p95 Context Switches/sec", value : baseval, yaxis : 1 }];

		if (Math.abs(baseval - base5min >= 10)) {
			baselineArray.push({label : "5 min p95 Context Switches/sec", value : base5min, yaxis : 1, position : "right" });
		}	

		const scatterArray = getScatterArray(csColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={csRef} chartTitle={csTitle} columnInfoArr={csColumns} seriesy1={cobj1.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" 
					baselineArray={baselineArray} 
					scatterArray={scatterArray}
					y1AxisTitle="Context Switches/sec" y1AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getPgSwapChart = useCallback(() =>
	{
		const		obj = objref.current[pgSwapTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const		baseval1 = cobj1.baseline_;
		const		baseval2 = cobj2.baseline_;

		const 		baselineArray = [
					{label : "Overall p95 Paging In/Out per sec", value : baseval1, yaxis : 1 },
					{label : "Overall p95 Swap In/Out per sec", value : baseval2, yaxis : 2, position : "right" }
				];

		const scatterArray = getScatterArray("pg_inout_sec", 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={pgSwapRef} chartTitle={pgSwapTitle} columnInfoArr={pgSwapColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="Paging In/Out per sec" y2AxisTitle="Pages Swapped In/Out per sec" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	



	const getForkProcChart = useCallback(() =>
	{
		const		obj = objref.current[forkProcTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const		baseval1 = cobj1.baseline_;
		const		baseval2 = cobj2.baseline_;

		const 		baselineArray = [
					{label : "Overall p95 New Processes/sec", value : baseval1, yaxis : 1 },
					{label : "Overall p95 Runnable Processes", value : baseval2, yaxis : 2, position : "right" }
				];

		const scatterArray = getScatterArray("procs", 2, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={forkProcRef} chartTitle={forkProcTitle} columnInfoArr={forkProcColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="New Processes/sec" y2AxisTitle="Runnable Processes" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getFaultStallChart = useCallback(() =>
	{
		const		obj = objref.current[faultStallTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const scatterArray = getScatterArray(faultStallColumns[0].col, 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={faultStallRef} chartTitle={faultStallTitle} columnInfoArr={faultStallColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					scatterArray={scatterArray}
					y1AxisTitle="Major Page Faults" y2AxisTitle="Memory Reclaim Stalls" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getRSSOOMChart = useCallback(() =>
	{
		const		obj = objref.current[rssOOMTitle];
		
		if (!obj) {
			return null;
		}	

		const		cobj1 = obj.chartobj_[0], cobj2 = obj.chartobj_[1];

		if (!cobj1.timeseries_ || !cobj2.timeseries_) {
			return null;
		}	

		const		baseval1 = cobj1.baseline_;

		const 		baselineArray = [
					{label : "Overall p95 Resident Memory %", value : baseval1, yaxis : 1 },
				];

		const scatterArray = getScatterArray("rss_pct", 1, cpuRadiusCb, memRadiusCb);

		const chart = (
				<>
				<GyLineChart ref={rssOOMRef} chartTitle={rssOOMTitle} columnInfoArr={rssOOMColumns} 
					seriesy1={cobj1.timeseries_} seriesy2={cobj2.timeseries_}
					enableTracker={true} chartHeight={350} y1AxisType="linear" y2AxisType="linear"
					baselineArray={baselineArray}
					scatterArray={scatterArray}
					y1AxisTitle="Resident and Committed Memory %" y2AxisTitle="Processes killed by OOM" 
					y1AxisFormat=",.0f" y2AxisFormat=",.0f" onRescaleComps={onRescaleComps} timeRangeCB={timeRangeCB} />
				<div style={{ marginBottom: 30 }}>
				</div>
				</>
				);

		return chart;		

	}, [objref, onRescaleComps, timeRangeCB]);	

	const getTimeSliderMarks = useCallback(() => {
		let		markobj = {};

		if (objref && objref.current && objref.current.summary) {
			const			statemarker = objref.current.summary.statemarker;

			if (statemarker && statemarker.length > 0) {
				for (let i = 0;  i < statemarker.length; ++i) {
					markobj[statemarker[i]] = CreateRectSvg('red', 3);
				}	
			}	

			if (objref.current.summary.starttime.length) {
				markobj[0] = moment(objref.current.summary.starttime, moment.ISO_8601).format("HH:mm:ss");
			}	

			if (objref.current.prevdatastart && objref.current.prevdatastart.length && (objref.current.summary.endtime.length)) {
				markobj[objref.current.prevdatastart.length - 1] = moment(objref.current.summary.endtime, moment.ISO_8601).format("HH:mm:ss");
			}
		}

		return markobj;

	}, [objref]);	
	
	const getSummary = () => {
		return (
			<>
			{<CpuMemSummary objref={objref} isRealTime={isRealTime} aggregatesec={isaggregated ? aggregatesec : undefined} aggroper={aggroper} 
					timeSliderIndex={timeSliderIndex !== null ? timeSliderIndex : undefined} modalCount={modalCount} isTabletOrMobile={isTabletOrMobile}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />}
			{<h4 style={{ textAlign : 'center', marginTop : 20 }} ><em><strong>Time Range Summary Slider</strong></em></h4>}
			<div style={{ marginLeft : 60, marginRight : 60 }} >
			{<Slider marks={getTimeSliderMarks()} min={0} max={objref.current.maxSlider} 
					onChange={onTimeSliderChange} onAfterChange={onTimeSliderAfterChange} tooltipVisible={false} />}
			</div>		
			<div style={{ marginBottom: 30 }}></div>
			</>
		);
	};

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
			return;
		}

		const			tabKey = `CPUMemMonitor_${Date.now()}`;
		
		CreateTab('CPU Memory History', 
			() => { return <CPUMemPage isRealTime={false} starttime={tstarttime} endtime={tendtime} parid={parid} 
						aggregatesec={useAggr ? aggrMin * 60 : undefined} aggregatetype={aggrType}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [parid, addTabCB, remTabCB, isActiveTabCB]);	


	const optionDiv = () => {
		const searchtitle = `Search Host '${objref.current.summary.hostname}' CPU Memory State`;

		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			<ButtonModal buttontext={searchtitle} width={'90%'} okText="Cancel"
				contentCB={() => (
					<GenericSearchWrap title={searchtitle} parid={parid}
						inputCategory='hosts' inputSubsys='cpumem' maxrecs={50000} 
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				)} />
					

			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			{isRealTime && realtimePaused === false && (<Button icon={<PauseCircleOutlined />} onClick={() => {objref.current.pauserealtime = true}}>Pause Auto Refresh</Button>)}
			{isRealTime && realtimePaused && (<Button icon={<PlayCircleOutlined />} onClick={() => {objref.current.resumerealtime = true}}>Resume Auto Refresh</Button>)}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical CPU Memory State'
					showTime={false} showRange={true} minAggrRangeMin={1} maxAggrRangeMin={60} disableFuture={true} />
			
			</Space>
			</div>

			</div>
			</>
		);
	};


	const getPrevCharts = (alertvar) => {
		return (
			<>
			{alertvar}
			{optionDiv()}
			<div style={{ marginBottom: 20, marginLeft: 20, marginRight: 20 }}>
			{timeSliderIndex !== null ? getSummary() : objref.current.prevsummary}
			{objref.current.prevcharts}
			</div>
			</>
		);
	};


	let		hdrtag = null, bodycont = null;

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (isRealTime) {
			hdrtag = <Tag color='green'>Runnable with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>;
		}
		else {
			hdrtag = <Tag color='blue'>Auto Refresh Disabled</Tag>;
		}	

		if (safetypeof(data) === 'array' && data.length > 0 && (safetypeof(data[0].cpumem) === 'array') && data[0].cpumem.length > 0) { 

			if (safetypeof(data[0].hostinfo) === 'object') {
				objref.current.summary.hostname 	= data[0].hostinfo.host;
				objref.current.summary.clustername	= data[0].hostinfo.cluster;
			}

			let		newdata = data[0].cpumem;	

			if ((moment(newdata[0].time, moment.ISO_8601).unix() >= moment(objref.current.summary.starttime, moment.ISO_8601).unix()) && 
				(moment(newdata[newdata.length - 1].time, moment.ISO_8601).unix() <= moment(objref.current.summary.endtime, moment.ISO_8601).unix())) {

				console.log(`Duplicate record seen...`);

				bodycont = getPrevCharts(<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);

			}
			else {

				if (isaggregated) {
					newdata = setAggrDataState(newdata);
				}

				if (isRealTime) {
					fixedArrayAddItems(newdata, objref.current.realtimearray, fixedArraySize);
					calcSummary(objref.current.realtimearray, objref.current.summary, isaggregated);
				}
				else {
					calcSummary(newdata, objref.current.summary, isaggregated);
				}

				/*console.log(`Summary is ${JSON.stringify(objref.current.summary)}`);*/

				const		cpuvalid = getChartSeries(objref.current[cpuTitle].chartobj_[0], newdata, isRealTime, "cpu_p95", "cpu_5min_p95");
				const		cpuchart = cpuvalid === true ? getCpuChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing CPU chart : ${cpuvalid}`} />);
		

				const		csvalid = getChartSeries(objref.current[csTitle].chartobj_[0], newdata, isRealTime, "cs_p95_sec", "cs_5min_p95_sec");
				const		cschart = csvalid === true ? getCSChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Context Switch chart : ${csvalid}`} />);
		

				const		pgvalid = getChartSeries(objref.current[pgSwapTitle].chartobj_[0], newdata, isRealTime, "pginout_p95", null, true);
				const		swapvalid = pgvalid === true && getChartSeries(objref.current[pgSwapTitle].chartobj_[1], newdata, isRealTime, "swpinout_p95", null, false);
				const		pgswapvalid = pgvalid === true ? swapvalid : pgvalid;
				const		pgswapchart = pgswapvalid === true ? getPgSwapChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Memory Paging chart : ${pgswapvalid}`} />);
		


				const		forkvalid = getChartSeries(objref.current[forkProcTitle].chartobj_[0], newdata, isRealTime, "fork_p95_sec", null, true);
				const		procvalid = forkvalid === true && getChartSeries(objref.current[forkProcTitle].chartobj_[1], newdata, isRealTime, "procs_p95", null, false);
				const		forkprocvalid = forkvalid === true ? procvalid : forkvalid;
				const		forkprocchart = forkprocvalid === true ? getForkProcChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Process chart : ${forkprocvalid}`} />);
		

				const		faultvalid = getChartSeries(objref.current[faultStallTitle].chartobj_[0], newdata, isRealTime, null, null, true);
				const		stallvalid = faultvalid === true && getChartSeries(objref.current[faultStallTitle].chartobj_[1], newdata, isRealTime, null, null, false);
				const		faultstallvalid = faultvalid === true ? stallvalid : faultvalid;
				const		faultstallchart = faultstallvalid === true ? getFaultStallChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Page Faults chart : ${faultstallvalid}`} />);
		

				const		rssvalid = getChartSeries(objref.current[rssOOMTitle].chartobj_[0], newdata, isRealTime, "rss_pct_p95", null, true);
				const		oomvalid = rssvalid === true && getChartSeries(objref.current[rssOOMTitle].chartobj_[1], newdata, isRealTime, null, null, false);
				const		rssoomvalid = rssvalid === true ? oomvalid : rssvalid;
				const		rssoomchart = rssoomvalid === true ? getRSSOOMChart() : 
							(<Alert type="error" showIcon message={`Exception occured while showing Resident Memory chart : ${rssoomvalid}`} />);

				let		darr;

				if (isRealTime) {
					darr = objref.current.realtimearray;
				}
				else {
					darr = newdata;
				}	

				objref.current.maxSlider	= darr.length;
				objref.current.prevsummary 	= getSummary(darr.length);

				objref.current.prevcharts = (
					<>
					{cpuchart}
					{cschart}
					{pgswapchart}
					{forkprocchart}
					{faultstallchart}
					{rssoomchart}
					</>
				);

				bodycont = (
					<>
					<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />
					{optionDiv()}
					<div style={{ marginBottom: 20, marginLeft: 20, marginRight: 20 }}>
					{objref.current.prevsummary}
					{objref.current.prevcharts}
					</div>
					</>);

				if (objref.current.prevdata) {
					objref.current.updtracker = newdata[newdata.length - 1].time;
				}	

				objref.current.prevdata = data;
				objref.current.prevdatastart = darr;

				console.log(`Host CPU Mem Data seen for time ${newdata[0].time}`);
			}

			/*console.log(`Host CPU Mem Data seen : data.length = ${data[0].cpumem.length} ${JSON.stringify(data[0].cpumem).slice(0, 256)}`);*/
		}
		else {
			bodycont = getPrevCharts(<Alert type="error" showIcon message="Invalid or no data seen. Will retry after a few seconds..." description=<Empty /> />);

			console.log(`Host CPU Mem Data Invalid /No data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
			
			objref.current.nextfetchtime = Date.now() + 30000;
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getPrevCharts(<Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Host CPU Mem Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);

			objref.current.nextfetchtime = Date.now() + 30000;
		}
		else if (isloading) {
			hdrtag = <Tag color='blue'>Loading Data</Tag>;

			bodycont = getPrevCharts(<Alert type="info" showIcon message="Loading Data..." />);
		}
		else {
			if (isRealTime) {
				hdrtag = <Tag color='green'>Runnable with Auto Refresh every {fetchIntervalmsec/1000} sec</Tag>;
			}
			else {
				hdrtag = <Tag color='blue'>Auto Refresh Disabled</Tag>;
			}	

			bodycont = getPrevCharts(<Alert style={{ visibility: "hidden" }} type="info" showIcon message="Data Valid" />);
		}	
	}

	let 	drilltag = null;
	
	if (realtimePaused) {
		drilltag = <Tag color='cyan'>Auto Refresh Paused due to {objref.current.isdrilldown ? 'Chart drilldown' : (timeSliderIndex !== null) ? 'Time Slider' : 
				objref.current.pauserealtime ? 'User Initiated Pause' : 'inactive Tab'}</Tag>;
	}	

	const 	hdrtagall=<>{hdrtag}{drilltag}</>;

	return (
		<>
		<div style={{ marginLeft : 10, marginTop : 10, marginRight : 10 }} >

		<Title level={4}><em>{isaggregated ? "Aggregated" : ""} Host CPU Memory Monitor</em></Title>
		{hdrtagall}

		<div style={{ marginTop: 10, padding: 10 }}>

			<ErrorBoundary>
			{bodycont}
			</ErrorBoundary>

		</div>

		</div>
		</>

	);
};	



