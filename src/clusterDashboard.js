
import 			React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';

import			{Button, Popover, Space, Slider, Modal, Input, Descriptions, Statistic, Typography, Tag, Alert, notification, message, Row, Col} from 'antd';

import 			{format} from "d3-format";
import 			moment from 'moment';
import 			axios from 'axios';
import 			{useMediaQuery} from 'react-responsive';

import 			{GyTable, TimeFieldSorter, getTableScroll} from './components/gyTable.js';
import			{clusterDashKey} from './gyeetaTabs.js';
import 			{NodeApis} from './components/common.js';
import 			{safetypeof, validateApi, CreateTab, useFetchApi, CreateLinkTab, ComponentLife, fixedArrayAddItems, ButtonModal, 
			capitalFirstLetter, ButtonJSONDescribe, LoadingAlert, JSONDescription, getLocalTime} from './components/util.js';
import 			{HostDashboard, HostInfoDesc, HostInfoSearch, HostStateSearch, hostTableTab} from './hostViewPage.js';
import 			{SvcDashboard, svcTableTab} from './svcDashboard.js';
import 			{ProcDashboard, procTableTab} from './procDashboard.js';
import			{ClusterMonitor} from './clusterMonitor.js';
import 			{MultiFilters, SearchTimeFilter, SearchWrapConfig} from './multiFilters.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;
const 			{Search} = Input;

const			clusterfetchsec = 15;


export const clusterstatefields = [
	{ field : 'cluster',		desc : 'Cluster Name',			type : 'string',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nhosts',		desc : '# Cluster Hosts',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nlistissue',		desc : '# Service Issues',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nlisthosts',		desc : '# Hosts with Service Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nlisten',		desc : '# Total Services',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nprocissue',		desc : '# Process Issues',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nprochosts',		desc : '# Hosts with Process Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nproc',		desc : '# Total Processes',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'totqps',		desc : 'Services Queries/sec QPS',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'svcnetmb',		desc : 'Services Network MB',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'ncpuissue',		desc : '# Hosts with CPU Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nmemissue',		desc : '# Hosts with Memory Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'clusterstate',	valid : null, },
];

export const aggrclusterstatefields = [
	{ field : 'cluster',		desc : 'Cluster Name',			type : 'string',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nhosts',		desc : '# Cluster Hosts',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nlistissue',		desc : '# Service Issues',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nlisthosts',		desc : '# Hosts with Service Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nlisten',		desc : '# Total Services',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nprocissue',		desc : '# Process Issues',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nprochosts',		desc : '# Hosts with Process Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nproc',		desc : '# Total Processes',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'totqps',		desc : 'Services Queries/sec QPS',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'svcnetmb',		desc : 'Services Network MB',		type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'ncpuissue',		desc : '# Hosts with CPU Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'nmemissue',		desc : '# Hosts with Memory Issues',	type : 'number',	subsys : 'clusterstate',	valid : null, },
	{ field : 'inrecs',		desc : '# Records in Aggregation',	type : 'number',	subsys : 'clusterstate',	valid : null, },
];


const clusterColumns = [
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		render : 	text => <Button type="link">{text}</Button>,
	},
	{
		title :		'# Hosts',
		key :		'nhosts',
		dataIndex :	'nhosts',
		gytype :	'number',
	},	
	{
		title :		'# Service Issues',
		key :		'nlistissue',
		dataIndex :	'nlistissue',
		gytype :	'number',
		render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : undefined }} >{num} of {rec.nlisten}</span>,
	},
	{
		title :		'Service Issue Hosts',
		key :		'nlisthosts',
		dataIndex :	'nlisthosts',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'# Process Issues',
		key :		'nprocissue',
		dataIndex :	'nprocissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Process Issue Hosts',
		key :		'nprochosts',
		dataIndex :	'nprochosts',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},

	{
		title :		'Queries/sec',
		key :		'totqps',
		dataIndex :	'totqps',
		gytype :	'number',
	},
	{
		title :		'Service Network MB',
		key :		'svcnetmb',
		dataIndex :	'svcnetmb',
		gytype :	'number',
		responsive : 	['lg'],
	},
	{
		title :		'CPU Issue Hosts',
		key :		'ncpuissue',
		dataIndex :	'ncpuissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		'Memory Issue Hosts',
		key :		'nmemissue',
		dataIndex :	'nmemissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
];

const clusterAggrColumns = (aggrType) => {
	aggrType = capitalFirstLetter(aggrType) ?? 'Avg';

	const		astr = aggrType;

	return [
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
		render : 	text => <Button type="link">{text}</Button>,
	},
	{
		title :		`${astr} Hosts`,
		key :		'nhosts',
		dataIndex :	'nhosts',
		gytype :	'number',
	},	
	{
		title :		`${astr} Service Issues`,
		key :		'nlistissue',
		dataIndex :	'nlistissue',
		gytype :	'number',
		render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : undefined }} >{num} of {rec.nlisten}</span>,
	},
	{
		title :		`${astr} Service Issue Hosts`,
		key :		'nlisthosts',
		dataIndex :	'nlisthosts',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${astr} Process Issues`,
		key :		'nprocissue',
		dataIndex :	'nprocissue',
		gytype :	'number',
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${astr} Process Issue Hosts`,
		key :		'nprochosts',
		dataIndex :	'nprochosts',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},

	{
		title :		`${astr} Queries/sec`,
		key :		'totqps',
		dataIndex :	'totqps',
		gytype :	'number',
	},
	{
		title :		`${astr} Service Net MB`,
		key :		'svcnetmb',
		dataIndex :	'svcnetmb',
		gytype :	'number',
		responsive : 	['lg'],
	},
	{
		title :		`${astr} CPU Issues`,
		key :		'ncpuissue',
		dataIndex :	'ncpuissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},
	{
		title :		`${astr} Memory Issues`,
		key :		'nmemissue',
		dataIndex :	'nmemissue',
		gytype :	'number',
		responsive : 	['lg'],
		render :	(num) => <span style={{ color : num > 0 ? 'red' : undefined }} >{format(",")(num)}</span>,
	},

	];
};	

export const clusterAggrTimeColumns = (aggrType) => {
	return [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		sorter :	TimeFieldSorter,
		defaultSortOrder :	'ascend',
		render :	(val) => getLocalTime(val),
	},
	...clusterAggrColumns(aggrType),
	];
};	

export const clusterTimeColumns = [
	{
		title :		'Time',
		key :		'time',
		dataIndex :	'time',
		gytype :	'string',
		sorter :	TimeFieldSorter,
		defaultSortOrder :	'ascend',
		render :	(val) => getLocalTime(val),
	},
	...clusterColumns,
];


function getInitNormData()
{
	return {
		clusters	: [],
		clusterobj	: {},
		summary 	: {
			nclusters		:	0,
			nhosts			:	0,
			nsvc			:	0,
			nlisthosts		:	0,
			nprochosts		:	0,
			ntotqps			:	0,
			nclsvcissues		:	0,
			nclprocissues		:	0,

			cmaxhosts		:	'',
			maxhosts		:	0,
			cmaxlistissue		:	'',
			maxlistissue		:	0,
			cmaxprocissue		:	'',
			maxprocissue		:	0,
			cmaxqps			:	'',
			maxqps			:	0,

			starttime		: 	undefined,
			endtime			:	undefined,
			aggrType		:	undefined,
		},
	};	
}	

function getNormClusterState(apidata, starttime, endtime, aggrType)
{
	let			ndata = getInitNormData(), summary = ndata.summary, clobj = ndata.clusterobj, clarr = ndata.clusters;	

	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Cluster Status data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1 && apidata[0].error !== undefined && apidata[0].errmsg !== undefined) {
		throw new Error(`Cluster Status Error seen : ${apidata[0].errmsg}`);
	}	

	const addcluster = (clone) => {
		if (clobj[clone.cluster] === undefined) {
			clobj[clone.cluster] = clone;
			clarr.push(clone);
		}	
		else {
			const		c = clobj[clone.cluster];

			c.nhosts	+= clone.nhosts;
			c.nprocissue	+= clone.nprocissue;
			c.nprochosts	+= clone.nprochosts;
			c.nproc		+= clone.nproc;
			c.nlistissue	+= clone.nlistissue;
			c.nlisthosts	+= clone.nlisthosts;
			c.nlisten	+= clone.nlisten;
			c.totqps	+= clone.totqps;
			c.svcnetmb	+= clone.svcnetmb;
			c.ncpuissue	+= clone.ncpuissue;
			c.nmemissue	+= clone.nmemissue;

			if (clone.inrecs) {
				c.inrecs 	+= clone.inrecs;
			}	
		}	

	};	

	for (let shyama of apidata) {
		for (let cluster of shyama.clusterstate) {	
			addcluster(cluster);
		}
	}	

	if (starttime) {
		summary.starttime	= starttime;
	}
	else if (clarr.length > 0) {
		summary.starttime	= clarr[0].time;
	}	

	if (endtime) {
		summary.endtime		= endtime;
		summary.aggrType	= aggrType;
	}	

	summary.nclusters = clarr.length;

	for (let clone of clarr) {
		summary.nhosts		+= clone.nhosts;
		summary.nsvc		+= clone.nlisten;
		summary.nlisthosts	+= clone.nlisthosts;
		summary.nprochosts	+= clone.nprochosts;
		summary.ntotqps		+= clone.totqps;

		if (clone.nlistissue > 0) {
			summary.nclsvcissues++;	
		}
		
		if (clone.nprocissue > 0) {
			summary.nclprocissues++;	
		}
		
		if (summary.maxhosts < clone.nhosts) {
			summary.maxhosts	= clone.nhosts;
			summary.cmaxhosts 	= clone.cluster; 
		}	

		if (summary.maxlistissue < clone.nlistissue) {
			summary.maxlistissue	= clone.nlistissue;
			summary.cmaxlistissue 	= clone.cluster; 
		}	

		if (summary.maxprocissue < clone.nprocissue) {
			summary.maxprocissue	= clone.nprocissue;
			summary.cmaxprocissue 	= clone.cluster; 
		}	

		if (summary.maxqps < clone.totqps) {
			summary.maxqps		= clone.totqps;
			summary.cmaxqps 	= clone.cluster; 
		}	

	}

	return [ndata];
}	

export function mergeClusterTimestamps(apidata, usetimekey = true)
{
	if (false === Array.isArray(apidata)) {
		throw new Error(`Invalid Cluster Status data seen : snippet : ${JSON.stringify(apidata).slice(0, 256)}`);
	}

	if (apidata.length === 1) {
		return apidata[0];
	}

	/*
	 * The follwoing code will not be hit currently as we support only 1 Shyama
	 */
	const			cobj = {};

	const addcluster = (clone) => {
		const			key = `${clone.cluster}_${usetimekey ? clone.time : ''}`;

		if (cobj[key] === undefined) {
			cobj[key] = clone;
		}	
		else {
			const		c = cobj[key];

			c.nhosts	+= clone.nhosts;
			c.nprocissue	+= clone.nprocissue;
			c.nprochosts	+= clone.nprochosts;
			c.nproc		+= clone.nproc;
			c.nlistissue	+= clone.nlistissue;
			c.nlisthosts	+= clone.nlisthosts;
			c.nlisten	+= clone.nlisten;
			c.totqps	+= clone.totqps;
			c.svcnetmb	+= clone.svcnetmb;
			c.ncpuissue	+= clone.ncpuissue;
			c.nmemissue	+= clone.nmemissue;

			if (clone.inrecs) {
				c.inrecs 	+= clone.inrecs;
			}	
		}	
	};	

	for (let shyama of apidata) {
		for (let cluster of shyama.clusterstate) {	
			addcluster(cluster);
		}
	}	

	const clusterstate = [];

	for (const [, value] of Object.entries(cobj)) {
		clusterstate.push(value);
	}	
	
	return {clusterstate};
}	

export function ClusterStateQuickFilters({filterCB})
{
	if (typeof filterCB !== 'function') return null;

	const 		numregex = /^\d+$/;

	const onCluster = (value) => {
		filterCB(`{ clusterstate.cluster like ${value[0] !== "'" ? "'" + value + "'" : value} }`);
	};	

	const onIssue = () => {
		filterCB(`{ clusterstate.nprocissue > 0 } or { clusterstate.nlistissue > 0 } or { clusterstate.ncpuissue > 0 } or { clusterstate.nmemissue > 0 }`);
	};	

	const onSvcIssue = () => {
		filterCB(`{ clusterstate.nlistissue > 0 }`);
	};	

	const onQPS = (value) => {
		if (numregex.test(value)) {
			filterCB(`{ clusterstate.totqps > ${value} }`);
		}
		else {
			notification.error({message : "Input Format Error", description : `Input ${value} not a numeric format`});
		}	
	};	

	const onProcIssue = () => {
		filterCB(`{ clusterstate.nprocissue > 0 }`);
	};	

	const onCPUIssue = () => {
		filterCB(`{ clusterstate.ncpuissue > 0 }`);
	};	

	const onMemIssue = () => {
		filterCB(`{ clusterstate.nmemissue > 0 }`);
	};	

	return (
	<>	

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Cluster Name Like </strong></i></span>
	</div>
	<div>
	<Search placeholder="Regex like" allowClear onSearch={onCluster} style={{ width: 300 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Cluster has Service, Process, CPU or Memory Issues </strong></i></span>
	</div>
	<div style={{ width : 220, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onIssue} size='small' >Set Filter</Button>
	</div>
	</div>
	</>


	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Cluster has Service Issues </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onSvcIssue} size='small' >Set Filter</Button>
	</div>
	</div>
	</>


	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Cluster Services Queries/sec QPS greater than </strong></i></span>
	</div>
	<div>
	<Search placeholder="QPS" allowClear onSearch={onQPS} style={{ width: 250 }} enterButton={<Button>Set Filter</Button>} size='small' />
	</div>
	</div>
	</>


	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Cluster has Process Issues </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onProcIssue} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Cluster has CPU Issues </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onCPUIssue} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	<>
	<div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'space-around', margin: 30, border: '1px groove #d9d9d9', padding : 10}}>
	<div>
	<span style={{ fontSize : 14 }}><i><strong>Cluster has Memory Issues </strong></i></span>
	</div>
	<div style={{ width : 280, display: 'flex', justifyContent: 'flex-end' }}>
	<Button onClick={onMemIssue} size='small' >Set Filter</Button>
	</div>
	</div>
	</>

	</>
	);
}	

export function ClusterStateMultiQuickFilter({filterCB, linktext, quicklinktext})
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
			title : <Title level={4}>Cluster State Advanced Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={clusterstatefields} title='Cluster State Advanced Filters' />,
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
			title : <Title level={4}>Cluster State Quick Filters</Title>,

			content : <ClusterStateQuickFilters filterCB={onFilterCB} />,
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

export function ClusterStateAggrFilter({filterCB, linktext})
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
			title : <Title level={4}>Cluster State Aggregation Filters</Title>,
			content : <MultiFilters filterCB={onFilterCB} filterfields={aggrclusterstatefields} title='Cluster State Aggregation Filters' />,
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

export function ClusterStateSearch({starttime, endtime, useAggr, aggrMin, aggrType, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, aggrfilter, title, tabKey,
						customColumns, customTableColumns, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	const			[isrange, setisrange] = useState(false);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		let			mstart, mend;

		if (starttime || endtime) {

			mstart = moment(starttime, moment.ISO_8601);

			if (endtime) {
				mend = moment(endtime, moment.ISO_8601);

				if (mend.unix() >= mstart.unix() + 10) {
					setisrange(true);
				}
			}
		}
	
		const conf = 
		{
			url 	: NodeApis.clusterstate,
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
					sortcolumns	: sortColumns,
					sortdir		: sortColumns ? sortDir : undefined,
					recoffset       : recoffset > 0 ? recoffset : undefined,
				},	
			},
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);
					
			return mergeClusterTimestamps(apidata);
		};

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		}
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Cluster Table", 
						description : `Exception occured while waiting for Cluster Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Cluster Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [aggrMin, aggrType, doFetch, endtime, filter, aggrfilter, maxrecs, starttime, useAggr, customColumns, customTableColumns, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false && data) {
					dataRowsCb(data.clusterstate?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, dataRowsCb]);	


	if (isloading === false && isapierror === false) { 
		const			field = "clusterstate";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {

			if (typeof tableOnRow !== 'function') {
				if (!customTableColumns) {
					tableOnRow = (record, rowIndex) => {
						return {
							onClick: event => {
								Modal.info({
									title : <span><strong>Cluster {record.cluster}</strong></span>,
									content : (
										<>
										<ClusterModalCard rec={record} aggrType={useAggr ? aggrType : undefined} 
											recintervalsec={useAggr && aggrMin ? aggrMin * 60 : undefined} endtime={endtime}
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
									title : <span><strong>Cluster {record.cluster} State</strong></span>,
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


			let		columns, rowKey, titlestr, timestr;

			if (customColumns && customTableColumns) {
				columns = customTableColumns;
				rowKey = "rowid";
				titlestr = "Cluster State";
				timestr = <span style={{ fontSize : 14 }} > for time range {starttime} to {endtime}</span>;
			}
			else if (!isrange || (useAggr && !aggrMin)) {
				columns = !aggrMin ? clusterColumns : clusterAggrColumns(aggrType);
				rowKey = "cluster";

				titlestr = 'Cluster State';
				if (!title) title = 'Cluster State';
				timestr = <span style={{ fontSize : 14 }} > at {starttime ?? moment().format()} </span>;
			}
			else {
				rowKey = ((record) => record.cluster + record.time);

				columns = !useAggr ? clusterTimeColumns : clusterAggrTimeColumns(aggrType);
				titlestr = `${useAggr ? 'Aggregated ' : ''} Cluster State`;
				if (!title) title = 'Cluster State';
				
				timestr = <span style={{ fontSize : 14 }} > for time range {starttime} to {endtime}</span>;
			}	

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{titlestr}</Title>
				{timestr}
				<div style={{ marginBottom: 30 }} />
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.clusterstate} rowKey={rowKey} scroll={getTableScroll()} />
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


export function clusterTableTab({starttime, endtime, useAggr, aggrMin, aggrType, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, aggrfilter, modal, title,
						customColumns, customTableColumns, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Cluster State Query", description : `Invalid starttime specified for Cluster State : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Cluster State Query", description : `Invalid endtime specified for Cluster State : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Cluster State Query", description : `Invalid endtime specified for Cluster State : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? ClusterStateSearch;

	if (!modal) {
		const			tabKey = `ClusterState_${Date.now()}`;

		CreateTab(title ?? "Cluster State", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
						aggrfilter={aggrfilter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey} title={title} customColumns={customColumns} customTableColumns={customTableColumns}
						sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={ClusterStateSearch} /> 
					</>
				);	
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Cluster State",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<Comp starttime={starttime} endtime={endtime} useAggr={useAggr} aggrMin={aggrMin} aggrType={aggrType} filter={filter} 
					aggrfilter={aggrfilter} maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					title={title} customColumns={customColumns} customTableColumns={customTableColumns}
					sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={ClusterStateSearch} />
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

function getClusterHostListApiConf(clusterarr)
{
	if (clusterarr === undefined) {
		throw new Error(`Mandatory clusterarr property missing for Cluster Host List`);
	}

	if (typeof clusterarr === 'string') {
		clusterarr = [clusterarr];
	}	

	return {
		url 	: NodeApis.nodeparthainfo,
		method	: 'post',
		data 	: {
			qrytime		: Date.now(),
			timeoutsec 	: 10,
			clusterarr	: clusterarr,
		},
		timeout	: 10000,
	};	
}	

const clusterHostColumn = [
	{
		title :		'Hostname',
		key :		'host',
		dataIndex :	'host',
		gytype : 	'string',
		render : 	item => <Button type='link'>{item}</Button> 
	},
	{
		title :		'Cluster',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype :	'string',
	},
	{
		title :		'Gyeeta Partha ID',
		key :		'parid',
		dataIndex :	'parid',
		gytype : 	'string',
	},
	{
		title :		'Gyeeta Madhava ID',
		key :		'madid',
		dataIndex :	'madid',
		gytype : 	'string',
	},
];	
			

export function ClusterHostList({cluster, starttime, endtime, aggrType, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile})
{
	const 		[{ data, isloading, isapierror }, ] = useFetchApi(getClusterHostListApiConf(cluster), null, null, 'Cluster Host List API');

	let		hinfo = null;

	const tableOnRow = useCallback((rec, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Cluster Host <em>{rec.host}</em></strong></span>,
					content : (
						<HostInfoDesc parid={rec.parid} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
						),
					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
				});
			}
		};		
	}, [addTabCB, remTabCB, isActiveTabCB]);	


	const getClusterHostInfo = () => {

		const		tabKey = `ClusterHostInfo_${Date.now()}`;

		return CreateLinkTab(<span><i>Get Hosts System Info</i></span>, 'Cluster Host Info',
					() => { return <HostInfoSearch name={`Cluster ${cluster}`} filter={`({ hostinfo.cluster = '${cluster}' })`}
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
								isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};


	if (isloading === false && isapierror === false) { 

		if (safetypeof(data) === 'object' && safetypeof(data[cluster]) === 'array' && data[cluster].length > 0) { 

			hinfo = ( 
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={4}>{`List of Hosts for cluster '${cluster}'`}</Title>
				<div style={{ textAlign : 'left' }} >
				{getClusterHostInfo()}
				</div>
				<div style={{ marginTop: 20 }} />
				<GyTable columns={clusterHostColumn} onRow={tableOnRow} dataSource={data[cluster]} rowKey="parid" /> 
				</div>
				</>
			);
		}
		else {
			hinfo = (<Alert type="warning" showIcon message="No hosts found for this cluster. Historically deleted host data not shown..." />);
			console.log(`Cluster Host Info Data Invalid seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}
	else if (isapierror) {
		const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""}`;

		hinfo = <Alert type="error" showIcon message="Error Encountered" description={emsg} />;
		
		console.log(`Cluster Host Info Data Error seen : ${JSON.stringify(data).slice(0, 256)}`);
	}	
	else {
		hinfo = <LoadingAlert />;
	}

	return (
		<>
		<ErrorBoundary>
		{hinfo}
		</ErrorBoundary>
		</>
	);

}	

export function ClusterModalCard({rec, starttime, endtime, aggrType, recintervalsec, modalCount, addTabCB, remTabCB, isActiveTabCB})
{
	const 			isTabletOrMobile = useMediaQuery({ maxWidth: 1224 });
	const			isaggr = (rec.inrecs !== undefined);
	let			isrange = (starttime !== undefined && endtime !== undefined);
	let			titlestr = '', tstart, tend, aggrstr, monaggrsec;

	if (isaggr) {
		titlestr = 'Aggregated ';
		aggrstr = (aggrType ? capitalFirstLetter(aggrType) : 'Aggregated');
	}	

	titlestr += `Cluster '${rec.cluster}' State for `;

	if (rec.time && isaggr && recintervalsec > 0) {
		tstart = moment(rec.time, moment.ISO_8601).format();

		const				rt = moment(rec.time, moment.ISO_8601).add(recintervalsec, 'seconds');

		if (endtime) {
			const				em = moment(endtime, moment.ISO_8601);
			
			if (+em < +rt) {
				tend = em.format();
			}	
			else {
				tend = rt.format();
			}	
		}	
		else {
			tend = rt.format();
		}

		titlestr += `Time range between ${rec.time} and ${tend}`;

		if (recintervalsec > 3600) {
			monaggrsec = 60;
		}	
		isrange = true;
	}	
	else if (isrange) {
		tstart = starttime;
		tend = endtime;

		if (moment(tend, moment.ISO_8601).unix() - moment(tstart, moment.ISO_8601).unix() >= 3600) {
			monaggrsec = 60;
		}

		titlestr += `Time range between ${starttime} and ${endtime}`;
	}	
	else {
		tstart = rec.time;

		titlestr += `time at ${rec.time}`;
	}	

	const getClusterHostList = () => {

		const		tabKey = `ClusterHostList_${Date.now()}`;

		return CreateLinkTab(<span><i>Cluster Hosts List</i></span>, 'Cluster Hosts List',
					() => { return <ClusterHostList cluster={rec.cluster} starttime={tstart} endtime={tend}
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
								isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getClusterHostInfo = (linktext = 'Cluster Hosts System Info') => {

		const		tabKey = `ClusterHostInfo_${Date.now()}`;

		return CreateLinkTab(<span><i>{linktext}</i></span>, linktext,
					() => { return <HostInfoSearch name={`Cluster ${rec.cluster}`} filter={`({ hostinfo.cluster = '${rec.cluster}' })`}
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
								isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};


	const getClusterHostState = (linktext, filter) => {

		const		tabKey = `ClusterHostState_${Date.now()}`;

		return CreateLinkTab(<span><i>{linktext ?? 'Cluster Hosts State'}</i></span>, 'Cluster Hosts State',
					() => { return <HostStateSearch starttime={tstart} endtime={tend}
								useAggr={isaggr} aggrType={aggrType} 
								filter={filter}
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
								isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getClusterHistory = () => {
		const		tstartnew = moment(tstart, moment.ISO_8601).subtract(5, 'minute').format();
		const		tendnew = moment(tend ?? tstart, moment.ISO_8601).add(10, 'seconds').format();
		const		tabKey = `ClusterMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster State History</i></span>, 'Cluster State History',
					() => { return <ClusterMonitor cluster={rec.cluster} isRealTime={false} starttime={tstartnew} endtime={tendnew} aggregatesec={monaggrsec}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getClusterMonitor = () => {
		const		tabKey = `ClusterMonitor_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster State Realtime Monitor</i></span>, 'Cluster State Monitor',
					() => { return <ClusterMonitor cluster={rec.cluster} isRealTime={true}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getClusterHistoricalState = useCallback((date, dateString, useAggr, dateAggrMin, aggrType) => {
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

		const		tabKey = `SvcHist_${Date.now()}`;
		
		CreateTab('Service Historical State',
			() => { return <ClusterMonitor cluster={rec.cluster} isRealTime={false} 
					starttime={istimepoint ? dateString : dateString[0]} endtime={istimepoint ? undefined : dateString[1]} 
					aggregatesec={!istimepoint && useAggr && dateAggrMin ? dateAggrMin * 60 : undefined}
					aggregatetype={!istimepoint && useAggr ? aggrType : undefined}
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} 
					isTabletOrMobile={isTabletOrMobile} />}, tabKey, addTabCB);

	}, [rec, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile]);

	
	const getServiceHistory = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster Service Historical Dashboard</i></span>, 'Cluster Service Dashboard',
					() => { return <SvcDashboard autoRefresh={false} starttime={tstart} endtime={tend}
							filter={`({ host.cluster = '${rec.cluster}' })`} name={`Cluster '${rec.cluster}'`}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getServiceMonitor = () => {
		const		tabKey = `Service_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster Service Dashboard</i></span>, 'Cluster Service Dashboard',
					() => { return <SvcDashboard autoRefresh={true} 
							filter={`{ cluster = '${rec.cluster}' }`} name={`Cluster '${rec.cluster}'`}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};

	const getHostStateTable = (linktext, filter, useaggr) => {
		const		tstartnew = moment(tstart, moment.ISO_8601).subtract(5, 'seconds').format();
		const		tendnew = moment(tstart, moment.ISO_8601).add(isaggr && recintervalsec ? recintervalsec : 5, 'seconds').format();
		let		aggrMin;

		if (useaggr) {
			aggrMin = (moment(tendnew, moment.ISO_8601).unix() - moment(tstartnew, moment.ISO_8601).unix())/60 + 1;	// For single record aggr
		}	

		return <Button type='dashed' onClick={() => {
			hostTableTab({starttime : tstartnew, endtime : tendnew, useAggr : useaggr, aggrMin, aggrType : aggrType,
					filter, name : `Cluster ${rec.cluster}`, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const getSvcStateTable = (linktext, filter, useaggr) => {
		const		tstartnew = moment(tstart, moment.ISO_8601).subtract(5, 'seconds').format();
		const		tendnew = moment(tstart, moment.ISO_8601).add(isaggr && recintervalsec ? recintervalsec : 5, 'seconds').format();
		let		aggrMin;

		if (useaggr) {
			aggrMin = (moment(tendnew, moment.ISO_8601).unix() - moment(tstartnew, moment.ISO_8601).unix())/60 + 1;	// For single record aggr
		}	

		return <Button type='dashed' onClick={() => {
			svcTableTab({starttime : tstartnew, endtime : tendnew, useAggr : useaggr, aggrMin,  aggrType : aggrType, filter, name : `Cluster ${rec.cluster}`, 
					addTabCB, remTabCB, isActiveTabCB, isext : true, maxrecs : 10000, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	const getProcStateTable = (linktext, filter, useaggr) => {
		const		tstartnew = moment(tstart, moment.ISO_8601).subtract(5, 'seconds').format();
		const		tendnew = moment(tstart, moment.ISO_8601).add(isaggr && recintervalsec ? recintervalsec : 5, 'seconds').format();
		let		aggrMin;

		if (useaggr) {
			aggrMin = (moment(tendnew, moment.ISO_8601).unix() - moment(tstartnew, moment.ISO_8601).unix())/60 + 1;	// For single record aggr
		}	

		return <Button type='dashed' onClick={() => {
			procTableTab({starttime : tstartnew, endtime : tendnew, useAggr : useaggr, aggrMin,  aggrType : aggrType, filter, name : `Cluster ${rec.cluster}`, 
					addTabCB, remTabCB, isActiveTabCB, isext : true, maxrecs : 10000, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};


	const getProcessHistory = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster Process Historical Dashboard</i></span>, 'Cluster Process Dashboard',
					() => { return <ProcDashboard autoRefresh={false} starttime={tstart} endtime={tend}
							filter={`({ host.cluster = '${rec.cluster}' })`} name={`Cluster '${rec.cluster}'`}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getProcessMonitor = () => {
		const		tabKey = `Process_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster Process Dashboard</i></span>, 'Cluster Process Dashboard',
					() => { return <ProcDashboard autoRefresh={true}
							filter={`({ host.cluster = '${rec.cluster}' })`} name={`Cluster '${rec.cluster}'`}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	
	const getHostStateMonitor = () => {
		const		tabKey = `Host_${Date.now()}`;
		
		return CreateLinkTab(<span><i>Cluster Host State Dashboard</i></span>, 'Cluster Host State',
					() => { return <HostDashboard autoRefresh={true}
							filter={`{ cluster = '${rec.cluster}' }`} name={`Cluster '${rec.cluster}'`}
							addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
							isTabletOrMobile={isTabletOrMobile} /> }, tabKey, addTabCB);
	};
	


	return (
		<>
		<ErrorBoundary>

		<Descriptions title={titlestr} bordered={true} column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 2, xs: 1 }} style={{ textAlign: 'center' }}>

			{rec.inrecs > 0 && <Descriptions.Item label={<em># {aggrstr} Records</em>}> <Statistic valueStyle={{ fontSize: 16 }} value={rec.inrecs} /> </Descriptions.Item>}

			<Descriptions.Item label={<em>{aggrstr} Active Hosts</em>}> 
				<Popover title='Cluster Hosts' content={(
					<>
					<Space direction="vertical">
					{getClusterHostList()}
					{getClusterHostInfo()}
					{getClusterHostState('Cluster Hosts State', `({ host.cluster = '${rec.cluster}' })`)}
					</Space>
					</>
				)}	
				>
					<Button type='dashed'><Statistic valueStyle={{ fontSize: 16 }} value={rec.nhosts} /></Button> 
				</Popover>
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} Total Services</em>}>{format(",")(rec.nlisten)}</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} Services with Issues</em>}>
				{rec.nlistissue > 0 ? getSvcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlistissue)}</span>, 
				`( { host.cluster = '${rec.cluster}' } and { state in 'Bad','Severe' } )`, isaggr) : 0}
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} # Hosts with Service Issues</em>}>
				{rec.nlisthosts > 0 ? getHostStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nlisthosts)}</span>, 
				`( { host.cluster = '${rec.cluster}' } and { hoststate.nlistissue > 0 } )`, isaggr) : 0}
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} Services Queries/sec QPS</em>}>
				{rec.totqps > 0 ? getSvcStateTable(format(",")(rec.totqps), 
				`( { host.cluster = '${rec.cluster}' } and { qps5s > 0 } )`, isaggr) : 0}
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} Services Network Traffic</em>}>
				{rec.svcnetmb > 0 ? getSvcStateTable(`${format(",")(rec.svcnetmb)} MB`, 
				`( { host.cluster = '${rec.cluster}' } and { kbin15s + kbout15s > 0 } )`, isaggr) : "0 MB"}
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} Total Grouped Processes</em>}>{format(",")(rec.nproc)}</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} Processes with Issues</em>}>
				{rec.nprocissue > 0 ? getProcStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprocissue)}</span>, 
				`( { host.cluster = '${rec.cluster}' } and { state in 'Bad','Severe' } )`, isaggr) : 0}
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} # Hosts with Process Issues</em>}>
				{rec.nprochosts > 0 ? getHostStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nprochosts)}</span>, 
				`( { host.cluster = '${rec.cluster}' } and { nprocissue > 0 } )`, isaggr) : 0}
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} # Hosts with CPU Issues</em>}>
				{rec.ncpuissue > 0 ? getHostStateTable(<span style={{ color : 'red' }}>{format(",")(rec.ncpuissue)}</span>, 
				`( { host.cluster = '${rec.cluster}' } and { cpuissue = true } )`, isaggr) : 0}
			</Descriptions.Item>

			<Descriptions.Item label={<em>{aggrstr} # Hosts with Memory Issues</em>}>
				{rec.nmemissue > 0 ? getHostStateTable(<span style={{ color : 'red' }}>{format(",")(rec.nmemissue)}</span>, 
				`( { host.cluster = '${rec.cluster}' } and { memissue = true } )`, isaggr) : 0}
			</Descriptions.Item>

			<Descriptions.Item label={<em>Complete Record</em>}>{ButtonJSONDescribe({record : rec, fieldCols : aggrclusterstatefields})}</Descriptions.Item>

		</Descriptions>


		<div style={{ marginTop: 36, marginBottom: 16 }}>

		<Space direction="vertical">

		<Row justify="space-between">

		<Col span={8}> {getClusterHistory()} </Col>
		<Col span={8}> {getClusterMonitor()} </Col>

		</Row>
	
		<Row justify="space-between">

		<Col span={8}> {getClusterHostInfo('Cluster Hosts Info')} </Col>
		<Col span={8}> {getHostStateMonitor()} </Col>

		</Row>

		<Row justify="space-between">

		{!isrange && <Col span={8}> {getServiceHistory()} </Col>}
		<Col span={8}> {getServiceMonitor()} </Col>

		</Row>

		<Row justify="space-between">

		{!isrange && <Col span={8}> {getProcessHistory()} </Col>}
		<Col span={8}> {getProcessMonitor()} </Col>

		</Row>

		<Row justify="space-between">

		<Col span={8}> 
			<TimeRangeAggrModal onChange={getClusterHistoricalState} title={`Search '${rec.cluster}' Historical States`} 
					showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />
		</Col>			
		</Row>

		</Space>
		</div>

		</ErrorBoundary>

		</>

	);		
}

export function ClusterSummary({normdata, tableOnRow, columns, modalCount, addTabCB, remTabCB, isActiveTabCB })
{
	const 			summary = normdata.summary;
	const			starttime = summary.starttime, endtime = summary.endtime;

	let			tstr = '', mstart, mend;

	if (starttime) {
		mstart = moment(starttime, moment.ISO_8601);

		if (endtime) {
			mend = moment(endtime, moment.ISO_8601);
		}

		if (mstart.isValid()) {
			if (mend && mend.isValid()) {
				tstr = `for time range ${starttime} (${mstart.format("MMM Do YYYY HH:mm:ss.SSS Z")}) to ${endtime} (${mend.format("MMM Do YYYY HH:mm:ss.SSS Z")})`;
			}	
			else {
				tstr = `at ${starttime} (${mstart.format("MMM Do YYYY HH:mm:ss.SSS Z")})`;
			}	
		}	
	}

	const title = (<div style={{ textAlign : 'center', marginBottom : 20 }}>
		{<><Title level={4}>Cluster Summary</Title><br />
		<span style={{ fontSize : 14 }} > <em>{tstr}</em></span> 
		</>} 
		</div>);

	const createLinkModal = (linktext, desc, filt) => {

		const modonclick = () => {
			/*
			 * Using filtered array as prefilters in Ant Table are not reset on Modal close for filteredValue set
			 */
			Modal.info({
				title : (<div style={{ textAlign : 'center' }}>{<em>{desc} <br /> 
					<span style={{ fontSize : 14 }} > {tstr}</span> 
					</em>} </div>), 

				content : (
					<>
					<ComponentLife stateCB={modalCount} />
					<GyTable columns={columns} onRow={tableOnRow} modalCount={modalCount} dataSource={normdata.clusters.filter(filt)} 
						rowKey={((record) => record.cluster + record.time)} scroll={getTableScroll()} />
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
	
	const getHostStateTable = (linktext, filter) => {
		const		tstartnew = moment(mstart ? +mstart : undefined).subtract(5, 'seconds').format();
		const		tendnew = moment(mend ? +mend : undefined).add(5, 'seconds').format();

		return <Button type='dashed' onClick={() => {
			hostTableTab({starttime : tstartnew, endtime : tendnew, filter, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});
			}} >{linktext}</Button>;
	};

	return (
		<Descriptions title={title} bordered={true} column={{ xxl: 4, xl: 4, lg: 3, md: 3, sm: 2, xs: 1 }} >
			<Descriptions.Item 
				label={<em># Active Clusters</em>}>
				<Statistic valueStyle={{ fontSize: 14 }} value={summary.nclusters} />
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Active Hosts</em>}>
				<Statistic valueStyle={{ fontSize: 14 }} value={summary.nhosts} />
			</Descriptions.Item>

			<Descriptions.Item label={<em>Total Services</em>}>{format(",")(summary.nsvc)}</Descriptions.Item>

			<Descriptions.Item label={<em>Total Queries/sec QPS</em>}>{format(",")(summary.ntotqps)}</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Clusters with Service Issues</em>}>
				{summary.nclsvcissues > 0 ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nclsvcissues} />, 
					'Clusters with Service Issues', (item) => item.nlistissue > 0) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Service Issues</em>}>
				{summary.nlisthosts > 0 ? getHostStateTable(<span style={{ color : 'red' }} >{format(",")(summary.nlisthosts)} </span>, `({ hoststate.nlistissue > 0 })`) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Clusters with Process Issues</em>}>
				{summary.nclprocissues ? createLinkModal(<Statistic valueStyle={{ fontSize: 14, color : 'red' }} value={summary.nclprocissues} />, 
					'Clusters with Process Issues', (item) => item.nprocissue > 0) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em># Hosts with Process Issues</em>}>
				{summary.nprochosts > 0 ? getHostStateTable(<span style={{ color : 'red' }} >{format(",")(summary.nprochosts)} </span>, `({ hoststate.nprocissue > 0 })`) : 0}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Cluster with Max Hosts</em>}>
				{createLinkModal(<span><em> {summary.cmaxhosts} ({summary.maxhosts})</em></span>, 
					'Cluster with Max Hosts', (item) => summary.maxhosts > 0 && item.cluster === summary.cmaxhosts)}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Cluster with Max Service Issues</em>}>
				{summary.maxlistissue ? createLinkModal(<span><em> {summary.cmaxlistissue} ({summary.maxlistissue})</em></span>, 
					'Cluster with Max Service Issues', (item) => summary.maxlistissue > 0 && item.cluster === summary.cmaxlistissue) : '-'}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Cluster with Max Process Issues</em>}>
				{summary.maxprocissue ? createLinkModal(<span><em> {summary.cmaxprocissue} ({summary.maxprocissue})</em></span>, 
					'Cluster with Max Process Issues', (item) => summary.maxprocissue > 0 && item.cluster === summary.cmaxprocissue) : '-'}
			</Descriptions.Item>

			<Descriptions.Item 
				label={<em>Cluster with Max Service Queries/sec</em>}>
				{createLinkModal(<span><em> {summary.cmaxqps} ({summary.maxqps})</em></span>, 
					'Cluster with Max Service Queries/sec', (item) => summary.maxqps > 0 && item.cluster === summary.cmaxqps)}
			</Descriptions.Item>


		</Descriptions>
	);		
}


export function ClusterDashboard({autoRefresh, refreshSec, addTabCB, remTabCB, isActiveTabCB, tabKey, starttime, endtime, aggrType, filter, isTabletOrMobile})
{
	const 		objref = useRef(null);

	const 		[fetchIntervalmsec, ] = useState(autoRefresh && refreshSec >= 5 ? refreshSec * 1000 : clusterfetchsec * 1000);
	const		[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	const		[, setTimeSlider] = useState();
	const		[isPauseRefresh, pauseRefresh] = useState(false);
	const		[, setPauseRefresh] = useState();
	const		[filterStr, setFilterStr] = useState();

	if (objref.current === null) {
		console.log(`Cluster Dashboard initializing ...`);

		objref.current = {
			isrange 		: (typeof starttime === 'string' && typeof endtime === 'string'),
			rangesec		: 0,
			nextfetchtime		: Date.now(),
			nerrorretries		: 0,
			hostname		: '',
			prevdata		: null,
			pauseRefresh		: false,
			isPauseRefresh		: false,
			filterset		: false,
			modalCount		: 0,
			isstarted		: false,
			timeSliderIndex		: null,
			sliderTimer		: null,
			datahistarr		: [],
		};	
	}

	useEffect(() => {
		console.log(`Cluster Dashboard initial Effect called...`);

		return () => {
			console.log(`Cluster Dashboard destructor called...`);
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

				if (mend.unix() >= mstart.unix() + 2 * clusterfetchsec) {
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
		throw new Error(`Internal Error : Cluster Dashboard validProps check failed`);
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

	const tableOnRow = useCallback((record, rowIndex) => {
		return {
			onClick: event => {
				Modal.info({
					title : <span><strong>Cluster {record.cluster}</strong></span>,
					content : (
						<>
						<ComponentLife stateCB={modalCount} />
						<ClusterModalCard rec={record} starttime={objref.current.isrange ? starttime : undefined} endtime={objref.current.isrange ? endtime : undefined} 
							aggrType={aggrType ?? 'avg'} recintervalsec={objref.current.rangesec}
							isTabletOrMobile={isTabletOrMobile} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
						</>
						),

					width : '90%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
				});
			}
		};		
	}, [objref, starttime, endtime, aggrType, addTabCB, remTabCB, isActiveTabCB, isTabletOrMobile, modalCount]);	
	
	const getaxiosconf = useCallback((fetchparams = {}, timeoutsec = 30) => {
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
			url 	: NodeApis.clusterstate,
			method	: 'post',
			data : {
				qrytime		: Date.now(),
				timeoutsec 	: timeoutsec,

				options		: {
					filter		: fstr,
					...fetchparams,
				},
			},
			timeout : timeoutsec * 1000,
		};
	}, [objref, filter, filterStr]);


	useEffect(() => {
		
		let 		timer1;

		timer1 = setTimeout(async function apiCall() {
			try {
				let		conf, currtime = Date.now();
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

				if (objref.current.isPauseRefresh === true) {
					objref.current.pauseRefresh = true;
				}	

				if (true === objref.current.pauseRefresh || currtime < objref.current.nextfetchtime || (0 === objref.current.nextfetchtime && objref.current.isstarted)) {
					if (oldpause === false && objref.current.pauseRefresh) {
						setPauseRefresh(true);
					}	

					return;
				}

				conf = getaxiosconf();

				if (!autoRefresh) {
					conf.data.starttime = starttime;

					if (objref.current.isrange) {
						conf.data.endtime = endtime;

						conf.data.options = {
							aggregate	: true,
							aggroper	: aggrType,
						};	
					}
				}

				console.log(`Fetching Cluster Dashboard for config ${JSON.stringify(conf)}`);

				setApiData({data : [], isloading : true, isapierror : false});

				let 		res = await axios(conf);

				if (autoRefresh === true) {
					objref.current.nextfetchtime = Date.now() + fetchIntervalmsec;
				}
				else {
					objref.current.nextfetchtime = 0;
				}	

				validateApi(res.data);

				if (safetypeof(res.data) === 'array') { 
					const		ndata = getNormClusterState(res.data, starttime, endtime, aggrType);

					setApiData({data : ndata, isloading : false, isapierror : false});
				
					fixedArrayAddItems(ndata, objref.current.datahistarr, 10);

					objref.current.nerrorretries = 0
					objref.current.isstarted = true;
				}
				else {
					setApiData({data : [], isloading : false, isapierror : true});
					notification.error({message : "Data Fetch Error", description : "Invalid Data format during Data fetch... Will retry a few times later."});

					if (objref.current.nerrorretries++ < 5) {
						objref.current.nextfetchtime = Date.now() + 10000;
					}	
					else {
						objref.current.nextfetchtime = Date.now() + 60000;
					}	
				}	

			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});

				if (e.response && (e.response.status === 401)) {
					notification.error({message : "Authentication Failure", 
						description : `Authentication Error occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				}
				else {
					notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for new data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
				}

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);

				if (objref.current.nerrorretries++ < 5) {
					objref.current.nextfetchtime = Date.now() + 10000;
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
			console.log(`Destructor called for Cluster interval effect...`);
			if (timer1) clearTimeout(timer1);
		};
		
	}, [objref, getaxiosconf, autoRefresh, fetchIntervalmsec, starttime, endtime, aggrType, isActiveTabCB, tabKey]);	
	

	useEffect(() => {
		console.log('Filter Changes seen : Current Filter is ', filterStr);
		objref.current.fetchmsec = Date.now() + 1000;
		objref.current.pauseRefresh = false;
	}, [objref, filterStr]);


	const onTimeSliderChange = useCallback((newindex) => {
		if (objref && objref.current && objref.current.datahistarr.length > newindex && objref.current.datahistarr[newindex]) {
			setApiData({data : [objref.current.datahistarr[newindex]], isloading : false, isapierror : false});
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
				if (datahistarr[i] && datahistarr[i].summary) {
					const 		summary = datahistarr[i].summary;

					if (summary.starttime) {
						markobj[i] = moment(summary.starttime, moment.ISO_8601).format("HH:mm:ss");
					}
				}
			}	
		}

		return markobj;

	}, [objref]);	

	const onFilterCB = useCallback((newfilter) => {
		objref.current.nextfetchtime = Date.now() + 1000;
		setFilterStr(newfilter);
	}, [objref]);	

	const onResetFilters = useCallback(() => {
		objref.current.nextfetchtime = Date.now() + 1000;
		setFilterStr();
	}, [objref]);	

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

		const			tabKey = `ClusterDashboard_${Date.now()}`;
		
		CreateTab('Historical Clusters', 
			() => { return <ClusterDashboard autoRefresh={false} starttime={tstarttime} endtime={tendtime} aggrType={aggrType} filter={fstr}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	

	const onNewAutoRefresh = useCallback(() => {
		const			tabKey = filter ? `ClusterDashboard_${Date.now()}` : clusterDashKey;

		CreateTab('Cluster Dashboard',
			() => { return <ClusterDashboard autoRefresh={true} filter={filter}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	

	const onStateSearch = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs, aggrfilter) => {
		if (!date || !dateString) {
			return;
		}

		let			tstarttime, tendtime;

		if (safetypeof(date) === 'array') {
			if (date.length !== 2 || safetypeof(dateString) !== 'array' || false === date[0].isValid() || false === date[1].isValid()) {
				return `Invalid Search Historical Date Range set...`;
			}	

			tstarttime = dateString[0];
			tendtime = dateString[1];
		}
		else {
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				return `Invalid Search Historical Date set ${dateString}...`;
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

		// Now close the search modal
		Modal.destroyAll();

		clusterTableTab({starttime : tstarttime, endtime : tendtime, useAggr, aggrMin, aggrType, filter : fstr, aggrfilter, maxrecs, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range'
				initStart={true} showTime={true} showRange={true} minAggrRangeMin={1} disableFuture={true} />;
	}, []);

	const timecbnotime = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range'
				initStart={true} showTime={true} showRange={true} minAggrRangeMin={0} alwaysShowAggrType={true} disableFuture={true} />;
	}, []);

	const filtercb = useCallback((onfiltercb) => {
		return <ClusterStateMultiQuickFilter filterCB={onfiltercb} />;
	}, []);	

	const aggrfiltercb = useCallback((onfiltercb) => {
		return <ClusterStateAggrFilter filterCB={onfiltercb} />;
	}, []);	

	const optionDiv = () => {
		const		isfilter = (filterStr && filterStr.length > 0);

		return (
			<>
			<div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', border : '1px groove #7a7aa0', padding : 10 }} >

			<div style={{ display: 'flex', flexDirection: 'row' }}>
			<Space>

			{!filter && !isfilter && autoRefresh && (
			<Popover title='Apply Dashboard Filters' content=<ClusterStateMultiQuickFilter filterCB={onFilterCB} /> >
			<Button>Apply Dashboard Filters</Button>
			</Popover>
			)}

			{!filter && isfilter && autoRefresh && (
			<Popover title='Filters Active' content=<Tag color='cyan'>{filterStr}</Tag>>
			<Button onClick={onResetFilters}>Reset All Filters</Button>
			</Popover>
			)}


			<ButtonModal buttontext='Search Cluster State' width={1200} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onStateSearch} title='Search Cluster State' 
						timecompcb={timecb} filtercompcb={filtercb} aggrfiltercb={aggrfiltercb} ismaxrecs={true} defaultmaxrecs={50000} />
				)} />
					

			</Space>
			</div>

						

			<div style={{ marginLeft : 20 }}>
			<Space>

			{autoRefresh && isPauseRefresh === false && (<Button onClick={() => {pauseRefresh(true)}}>Pause Auto Refresh</Button>)}
			{autoRefresh && isPauseRefresh === true && (<Button onClick={() => {pauseRefresh(false)}}>Resume Auto Refresh</Button>)}

			{!autoRefresh && (<Button onClick={() => {onNewAutoRefresh()}}>Auto Refreshed Dashboard</Button>)}

			<ButtonModal buttontext='Historical Cluster Dashboard' width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onHistorical} title='Historical Cluster Dashboard'
						timecompcb={timecbnotime} filtercompcb={filtercb} />
				)} />

			</Space>
			</div>

			</div>
			</>
		);
	};


	let			hdrtag = null, bodycont = null, filtertag = null;

	if (objref.current && objref.current.filterset) {
		filtertag = <Tag color='cyan'>Filters Set</Tag>;
	}	

	const getContent = (normdata, alertdata) => {

		if (!(safetypeof(normdata) === 'array' && normdata.length > 0 && safetypeof(normdata[0]) === 'object' && 
			safetypeof(normdata[0].clusters) === 'array' && safetypeof(normdata[0].summary) === 'object')) { 
			return (
				<>
				{alertdata}
				</>
			);
		}

		const		columns = (!objref.current.isrange ? clusterColumns : clusterAggrColumns(aggrType));

		return (
			<>
			{alertdata}

			{optionDiv()}

			{autoRefresh && (
				<>
				<h4 style={{ textAlign : 'center' }} ><em><strong>Recent Time History Slider</strong></em></h4>
				<div style={{ marginLeft : 60, marginRight : 60, marginBottom : 50 }} >
				<Slider marks={getTimeSliderMarks()} min={0} max={objref.current.datahistarr.length} 
					onChange={onTimeSliderChange} onAfterChange={onTimeSliderAfterChange} tooltipVisible={false} />
				</div>	
				</>	
				)	
			}

			<>
			<section style={{ textAlign: 'center', marginTop: 30, marginBottom: 30  }}>
			<ClusterSummary normdata={normdata[0]} columns={columns} tableOnRow={tableOnRow} modalCount={modalCount} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB}
			/>
			</section>


			<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 30 }} >
			<Title level={4}>List of Clusters</Title>
			<GyTable columns={columns} dataSource={normdata[0].clusters} onRow={tableOnRow} modalCount={modalCount} 
					rowKey="cluster" scroll={{ x: objref.current.isrange ? 1100 : undefined }} />
			</div>

			</>

			</>
		);
	};	

	if (isloading === false && isapierror === false && data !== objref.current.prevdata) { 

		if (safetypeof(data) === 'array' && data.length > 0 && safetypeof(data[0].clusters) === 'array') { 
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
				objref.current.nextfetchtime = Date.now() + 10000;

				emsg = "Invalid or no data seen. Will retry after a few seconds...";
			}
			else {
				objref.current.nextfetchtime = Date.now() + 60000;

				emsg = "Invalid or no data seen. Too many retry errors...";
			}	

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message={emsg} />);

			console.log(`Cluster Dashboard Data Error seen : ${JSON.stringify(data).slice(0, 1024)}`);
		}
	}	
	else {

		if (isapierror) {
			const emsg = `Error while fetching data : ${typeof data === 'string' ? data : ""} : Will retry after a few seconds...`;

			hdrtag = <Tag color='red'>Data Error</Tag>;

			bodycont = getContent(objref.current.prevdata, <Alert type="error" showIcon message="Error Encountered" description={emsg} />);
			
			console.log(`Cluster Dashboard Error seen : ${JSON.stringify(data).slice(0, 256)}`);

			objref.current.nextfetchtime = Date.now() + 10000;
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
		<Title level={4}><em>Global Cluster Dashboard{ filter ? ' with input filters' : ''}</em></Title>
		{hdrtag} {filtertag}

		<ErrorBoundary>
		{bodycont}
		</ErrorBoundary>

		</>
	);
};

