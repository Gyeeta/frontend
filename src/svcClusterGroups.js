
import 			React, {useState, useEffect, useCallback, useRef} from 'react';

import 			moment from 'moment';

import 			{Button, Space, Modal, message, Typography, Empty, Alert, notification} from 'antd';

import 			{format} from "d3-format";

import 			{safetypeof, validateApi, useFetchApi, CreateTab, LoadingAlert, fetchValidate, mergeMultiFetchMadhava,
			ButtonModal, sortTimeArray, onRowJSONDescribe, formatFloat} from './components/util.js';
import 			{GyTable, getTableScroll} from './components/gyTable.js';
import 			{NodeApis} from './components/common.js';
import			{getSvcStateColumns, svcStateOnRow, ExtSvcDesc, aggrsvcstatefields, extsvcfields} from './svcDashboard.js';
import 			{TimeRangeAggrModal} from './components/dateTimeZone.js';
import 			{MultiFilters, SearchTimeFilter, SearchWrapConfig} from './multiFilters.js';

const 			{Title} = Typography;
const 			{ErrorBoundary} = Alert;

export const svcmeshclustfields = [
	{ field : 'name',		desc : 'Service Name',			type : 'string',	subsys : 'svcmeshclust',	valid : null, },
	{ field : 'cluster',		desc : 'Cluster Name',			type : 'string',	subsys : 'svcmeshclust',	valid : null, },
	{ field : 'nsvc',		desc : '# Relative Services in Group',	type : 'number',	subsys : 'svcmeshclust',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'svcmeshclust',	valid : null, },
	{ field : 'clustid',		desc : 'Service Group ID',		type : 'string',	subsys : 'svcmeshclust',	valid : null, },
	{ field : 'relidarr',		desc : 'Individual Service Info',	type : 'string',	subsys : 'svcmeshclust',	valid : null, },
];

function svcTimeComp(component, tstart, tend, record, addTabCB, remTabCB, isActiveTabCB)
{
	const			tabKey = `Svcstate_${Date.now()}`;
	const			Comp = component;

	CreateTab('Service State', 
		() => (
			<Comp record={record} starttime={tstart} endtime={tend} 
					addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
		), tabKey, addTabCB);
}

function svcmeshCol(tstart, tend, addTabCB, remTabCB, isActiveTabCB)
{
	return [
	{
		title :		'Service Name',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	120,
		fixed : 	'left',
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype : 	'string',
		width : 	160,
	},	
	{
		title :		'# Related Services in Group',
		key :		'nsvc',
		dataIndex :	'nsvc',
		gytype :	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},
	{
		title :		'Operations',
		dataIndex :	'oper',
		gytype :	'number',
		width : 	100,
		render : 	(_, record) => <Button onClick={() => svcTimeComp(MeshSvcStateTable, tstart, tend, record, addTabCB, remTabCB, isActiveTabCB)} 
									type="link">Get Service State Summary</Button>,
	},
	];
}	

export const svcipclustfields = [
	{ field : 'name',		desc : 'Service Name',			type : 'string',	subsys : 'svcipclust',	valid : null, },
	{ field : 'cluster',		desc : 'Cluster Name',			type : 'string',	subsys : 'svcipclust',	valid : null, },
	{ field : 'nsvc',		desc : '# Services in Group',		type : 'number',	subsys : 'svcipclust',	valid : null, },
	{ field : 'svcip',		desc : 'Virtual IP Address',		type : 'string',	subsys : 'svcipclust',	valid : null, },
	{ field : 'svcport',		desc : 'Virtual Port',			type : 'number',	subsys : 'svcipclust',	valid : null, },
	{ field : 'time',		desc : 'Timestamp of Record',		type : 'timestamptz',	subsys : 'svcipclust',	valid : null, },
	{ field : 'clustid',		desc : 'Service Group ID',		type : 'string',	subsys : 'svcipclust',	valid : null, },
	{ field : 'relidarr',		desc : 'Individual Service Info',	type : 'string',	subsys : 'svcipclust',	valid : null, },
];

function svcipCol(tstart, tend, addTabCB, remTabCB, isActiveTabCB)
{	
	return [
	{
		title :		'Service Name',
		key :		'name',
		dataIndex :	'name',
		gytype : 	'string',
		width : 	120,
		fixed : 	'left',
	},	
	{
		title :		'Cluster Name',
		key :		'cluster',
		dataIndex :	'cluster',
		gytype : 	'string',
		width : 	160,
	},	
	{
		title :		'# Services in Group',
		key :		'nsvc',
		dataIndex :	'nsvc',
		gytype :	'number',
		width : 	100,
		render :	(num) => format(",")(num),
	},
	{
		title :		'Virtual IP',
		key :		'svcip',
		dataIndex :	'svcip',
		gytype : 	'string',
		width :		140,
	},	
	{
		title :		'Virtual Port',
		key :		'svcport',
		dataIndex :	'svcport',
		gytype : 	'number',
		width : 	80,
	},	
	{
		title :		'Operations',
		dataIndex :	'oper',
		gytype :	'number',
		width : 	100,
		render : 	(_, record) => <Button onClick={() => svcTimeComp(VirtualIPSvcStateTable, tstart, tend, record, addTabCB, remTabCB, isActiveTabCB)} 
									type="link">Get Service State Summary</Button>,
	},
	];
}	

export function SvcMeshFilter({filterCB, linktext})
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
			title : <Title level={4}>Interconnected Service Group Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={svcmeshclustfields} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return <Button onClick={multifilters} >{linktext ?? "Interconnected Service Group Filters"}</Button>;	
}

export function SvcVirtIPFilter({filterCB, linktext})
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
			title : <Title level={4}>Virtual IP Service Group Filters</Title>,

			content : <MultiFilters filterCB={onFilterCB} filterfields={svcipclustfields} />,
			width : '80%',	
			closable : true,
			destroyOnClose : false,
			maskClosable : false,
			okText : 'Cancel',
			okType : 'default',
		});

	}, [objref, onFilterCB]);	

	return <Button onClick={multifilters} >{linktext ?? "Virtual IP Service Group Filters"}</Button>;	
}


/*
 * Combine already aggregated svcstate stats (1 min aggr) to cumulative stats both grouped by svcid and overall across all svcs
 */
export function svcStateAggrStats(dataarr)
{
	function initall() 
	{
		return {
			time 		: '',
			qps5s 		: 0,
			nqry5s		: 0,
			resp5s		: 0,
			nconns		: 0,
			nactive		: 0,
			kbin15s		: 0,
			kbout15s 	: 0,
			sererr		: 0,
			clierr		: 0,
			delayus		: 0,
			cpudelus	: 0,
			iodelus		: 0,
			vmdelus		: 0,
			
			// The following are to be calculated by summing the svc specfic avgs
			usercpu		: 0,
			syscpu		: 0,
			rssmb		: 0,

			svcissue	: 0,
			inproc		: 0,
			inqps		: 0,
			inaconn		: 0,
			inhttperr	: 0,
			inoscpu		: 0,
			inosmem		: 0,
			indepsvc	: 0,
			inunknown	: 0,
			
			ishttp		: false,
			inrecs		: 0,	
		};
	};


	const odata = {
		summrec		: initall(),
		timearr		: [],
		svcarr		: [], 
		svc1marr	: dataarr, 
		svcmap		: new Map(),

		addrec(orec, trec, inrecs) {
			orec.qps5s	+= trec.qps5s;
			orec.nqry5s	+= trec.nqry5s;
			orec.resp5s	+= trec.resp5s;
			orec.nconns	+= trec.nconns;
			orec.nactive	+= trec.nactive;
			orec.kbin15s	+= trec.kbin15s;
			orec.kbout15s	+= trec.kbout15s;
			orec.sererr	+= trec.sererr;
			orec.clierr	+= trec.clierr;
			orec.delayus	+= trec.delayus;
			orec.cpudelus	+= trec.cpudelus;
			orec.iodelus	+= trec.iodelus;
			orec.vmdelus	+= trec.vmdelus;
			orec.usercpu	+= trec.usercpu;
			orec.syscpu	+= trec.syscpu;
			orec.rssmb	+= trec.rssmb;
			orec.svcissue	+= trec.svcissue;
			orec.inproc	+= trec.inproc;
			orec.inqps	+= trec.inqps;
			orec.inaconn	+= trec.inaconn;
			orec.inhttperr	+= trec.inhttperr;
			orec.inoscpu	+= trec.inoscpu;
			orec.indepsvc	+= trec.indepsvc;
			orec.inunknown	+= trec.inunknown;
			
			orec.ishttp	= orec.ishttp || trec.ishttp;
			orec.inrecs	+= inrecs;
		},	

		recaggr(orec) {
			if (!orec.inrecs) return;

			orec.qps5s 	= formatFloat(orec.qps5s/orec.inrecs);
			orec.resp5s	= formatFloat(orec.resp5s/orec.inrecs);
			orec.nconns	= formatFloat(orec.nconns/orec.inrecs);
			orec.nactive	= formatFloat(orec.nactive/orec.inrecs);
			orec.usercpu	= formatFloat(orec.usercpu/orec.inrecs);
			orec.syscpu	= formatFloat(orec.syscpu/orec.inrecs);
			orec.rssmb	= formatFloat(orec.rssmb/orec.inrecs);
		},	

		finalaggr() {
			if (this.timearr[0]) {
				this.addrec(this.summrec, this.timearr[this.timearr.length - 1], 1);
				this.recaggr(this.summrec);
			
				for (let srec of this.svcmap.values()) {
					this.recaggr(srec);

					this.svcarr.push(srec);
				}	

				this.summrec.time = this.timearr[0].time;
			}	

			delete this.svcmap;
		},	

		updrec(rec) {
			let			trec = this.timearr[this.timearr.length - 1];
			let			srec = this.svcmap.get(rec.svcid);

			if (!srec) {
				srec = { ...rec };
				srec.inrecs = 1;

				this.svcmap.set(rec.svcid, srec);
			}	
			else {
				this.addrec(srec, rec, 1);
			}	

			if (!trec || trec.time !== rec.time) {
				if (trec) {
					// Summary last min stats
					this.addrec(this.summrec, trec, 1);
				}	

				trec 		= initall();
				trec.time 	= rec.time;

				this.timearr.push(trec);
			}	
			
			this.addrec(trec, rec, rec.inrecs);	
		},	
	};

	if (!Array.isArray(dataarr)) {
		throw new Error("Invalid response received from server. Missing extsvcstate...");
	}	

	sortTimeArray(dataarr);

	for (let rec of dataarr) {
		odata.updrec(rec);
	}	

	odata.finalaggr();

	return odata;
}


// Returns an array of axios configs
function getMeshStateProms(record, starttime, endtime)
{
	const			promarr = [];

	if (!record || !record.relidarr) {
		throw new Error('Record Missing or has unknown format');
	}	

	const			relidarr = record.relidarr, nsvc = record.relidarr.length;
	let			off = 0, ioff = 0;
	
	if (!nsvc) {
		throw new Error('Record has 0 Clustered Services');
	}	

	// We batch in multiples of 16. TODO Optimize the batches by clubbing madhava's and parid's

	outer : for (let i = 0; i < nsvc; i += ioff) {
		const			madset = new Set();
		let			filter = '';

		for (ioff = 0; ioff < 16 && off < nsvc; ++ioff, ++off) {
			const			robj = relidarr[off];

			if (safetypeof(robj) !== 'object') {
				break outer;
			}	
			
			madset.add(robj.madid);

			filter += `${ioff > 0 ? ' or ' : ''} ( { parid = '${robj.parid}' } and { relsvcid = '${robj.relid}' } )`;
		}

		if (!filter || !starttime || ioff === 0) {
			break;
		}	

		const			madfilterarr = [];

		for (let madid of madset) {
			madfilterarr.push(madid);
		}	

		promarr.push(fetchValidate({
			conf : {
				url 	: NodeApis.extsvcstate,
				method	: 'post',
				data 	: {
					madfilterarr,
					starttime,
					endtime,
					options		:	{
						aggregate	:	starttime && endtime ? true : false,
						aggrsec		:	60,
						aggroper	:	'sum',
						filter		:	filter,
						timeoutsec 	: 	60,
					},
				},
				timeout	: 60000,
			}, 
			validateCB : validateApi,
			desc : 'Service State API',		
		}));
	}	

	if (promarr.length === 0) {
		throw new Error('Record has no Clustered Services');
	}	

	return promarr;
}	

function MeshSvcStateTable({record, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, tabKey})
{
	const			[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		
		if (!record || !isloading) {
			return;
		}	

		(async function() 
		{
			try {
				const			res = await Promise.all(getMeshStateProms(record, starttime, endtime));
				const			mres = mergeMultiFetchMadhava(res, 'extsvcstate');

				setApiData({data : svcStateAggrStats(mres.extsvcstate), isloading : false, isapierror : false});
			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for Service Mesh data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);
			}	
		})();

	}, [record, isloading, starttime, endtime]);	
	
	if (isloading === false && isapierror === false) { 
		if (data.timearr.length === 0) {
			hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {

			const			columns = getSvcStateColumns({isrange : true, useAggr : true, aggrType : 'sum', isext : true});
			const			summcolumns = getSvcStateColumns({isrange : true, useAggr : true, aggrType : 'sum', isext : false}).filter((col) => {
							switch (col.dataIndex) {
							
							case 'host' :
							case 'cluster' :
							case 'name' :
							case 'p95resp5s' :
							case 'p95resp5m' :
							case 'inrecs' :
								return false;

							default : return true;	
							}	
						});
			const			svccolumns = columns.filter((col) => {
							switch (col.dataIndex) {
							
							case 'p95resp5s' :
							case 'p95resp5m' :
							case 'inrecs' :
								return false;

							default : return true;	
							}
						});

			const			chgsvcissue = (colarr) => {
							for (let i = 0; i < colarr.length; ++i) {
								let		col = colarr[i];

								if (col.dataIndex === 'svcissue') {
									colarr[i] = { ...col, render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : 'green' }} >{num}</span> };
									break;
								}	
							}	
						};
			chgsvcissue(summcolumns);
			chgsvcissue(svccolumns);

			const			tableOnRow = svcStateOnRow({useAggr : true, aggrMin : 5, addTabCB, remTabCB, isActiveTabCB});
			const			summOnRow = onRowJSONDescribe({titlestr : "Interconnected Service Group Summary Statistics", 
								fieldCols : [...aggrsvcstatefields, ...extsvcfields]});

			const 			expandedRowRender = (rec) => <ExtSvcDesc rec={rec} />;

			const			timestr = (<span style={{ fontSize : 14, marginTop : 20, marginBottom : 30 }} >
							<strong> for time range {moment(starttime, moment.ISO_8601).format()} to {moment(endtime, moment.ISO_8601).format()}</strong>
							</span>);

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={3}>Interconnected Grouped Services Aggregated States</Title>
				{timestr}

				<div style={{ marginTop : 30 }}>
				<Title level={4}>Overall Statistics for all Services in Group</Title>
				<GyTable columns={summcolumns} onRow={summOnRow} dataSource={[data.summrec]} rowKey="time" scroll={getTableScroll()} />
				</div>

				<div>
				<Title level={4}>Overall Individual Service Level Statistics</Title>
				<GyTable columns={svccolumns} onRow={tableOnRow} dataSource={data.svcarr} 
					expandable={{ expandedRowRender }} rowKey="svcid" scroll={getTableScroll()} />
				</div>

				<div>
				<Title level={4}>Overall per minute Statistics for all Services</Title>
				<GyTable columns={summcolumns} onRow={summOnRow} dataSource={data.timearr} rowKey="time" scroll={getTableScroll()} />
				</div>

				<div>
				<Title level={4}>Individual Service Level per minute Statistics</Title>
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.svc1marr} 
					expandable={{ expandedRowRender }} rowKey="rowid" scroll={getTableScroll()} />
				</div>


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

function mergeMeshTimestamps(data)
{
	if (!data || !Array.isArray(data.svcmeshclust) || data.svcmeshclust.length <= 1) {
		return;
	}	

	let			svcmeshclust = data.svcmeshclust;
	let			omap = new Map();

	for (let tclust of svcmeshclust) {
		let			trel = omap.get(tclust.clustid);

		if (!trel) {
			trel = tclust;

			omap.set(tclust.clustid, tclust);

			tclust.relidset = new Set();
		}	

		for (let relid of tclust.relidarr) {
			trel.relidset.add(JSON.stringify(relid));
		}
	}	

	data.svcmeshclust = [];
	svcmeshclust = data.svcmeshclust;

	for (let tclust of omap.values()) {
		svcmeshclust.push(tclust);

		tclust.relidarr = [];

		for (let trelid of tclust.relidset) {
			tclust.relidarr.push(JSON.parse(trelid));
		}	

		tclust.nsvc = tclust.relidset.size;

		delete tclust.relidset;
	}
}	

function mergeSvcIPTimestamps(data)
{
	if (!data || !Array.isArray(data.svcipclust) || data.svcipclust.length <= 1) {
		return;
	}	

	let			svcipclust = data.svcipclust;
	let			omap = new Map();

	for (let tclust of svcipclust) {
		let			tsvc = omap.get(tclust.clustid);

		if (!tsvc) {
			tsvc = tclust;

			omap.set(tclust.clustid, tclust);

			tclust.svcidset = new Set();
		}	

		for (let relid of tclust.svcidarr) {
			tsvc.svcidset.add(JSON.stringify(relid));
		}
	}	

	data.svcipclust = [];
	svcipclust = data.svcipclust;

	for (let tclust of omap.values()) {
		svcipclust.push(tclust);

		tclust.svcidarr = [];

		for (let tsvcid of tclust.svcidset) {
			tclust.svcidarr.push(JSON.parse(tsvcid));
		}	

		tclust.nsvc = tclust.svcidset.size;

		delete tclust.svcidset;
	}
}	



export function SvcMeshGroups({starttime, endtime, filter, maxrecs = 10000, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.svcmeshclust,
			method	: 'post',
			data : {
				starttime	: starttime,
				endtime		: endtime,
				qrytime		: Date.now(),
				timeoutsec 	: 60,
				filter		: filter,
				maxrecs		: maxrecs,
				sortcolumns	: sortColumns,
				sortdir		: sortColumns ? sortDir : undefined,
				recoffset       : recoffset > 0 ? recoffset : undefined,
			},
			timeout : 60000,
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);

			if ((safetypeof(apidata) !== 'array') || (safetypeof(apidata[0]) !== 'object')) {
				throw new Error("Invalid Data Format seen");
			}	

			mergeMeshTimestamps(apidata[0]);

			return apidata[0];
		};

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		}
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Service Interconnected Group Table", 
						description : `Exception occured while waiting for Service Interconnected Group Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Service Interconnected Group Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs, starttime, endtime, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false) {
					dataRowsCb(data.svcmeshclust?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, dataRowsCb]);	


	if (isloading === false && isapierror === false) { 
		const				field = "svcmeshclust";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			let				tstart, tend;

			tstart = moment(starttime, starttime ? moment.ISO_8601 : undefined).subtract(4, 'minute').format();
			tend = moment(endtime ?? starttime, (starttime || endtime) ? moment.ISO_8601 : undefined).add(1, 'minute').format();

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >

				<Title level={4}>List of Interconnected Service Groups</Title>

				<div style={{ marginBottom : 20 }} > 
					<span ><strong>from {moment(tstart, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss Z")} to 
								{' '} {moment(tend, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss Z")}</strong></span>
				</div>

				<GyTable columns={svcmeshCol(tstart, tend, addTabCB, remTabCB, isActiveTabCB)} dataSource={data[field]} rowKey="rowid" onRow={tableOnRow} scroll={getTableScroll(700, 500)} />
				
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
	
export function svcMeshTab({starttime, endtime, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Interconnected Service Group Query", description : `Invalid starttime specified : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Interconnected Service Group Query", description : `Invalid endtime specified : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Interconnected Service Group Query", description : `Invalid endtime specified : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? SvcMeshGroups;

	if (!modal) {
		const			tabKey = `SvcState_${Date.now()}`;

		CreateTab(title ?? "Service Group", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp starttime={starttime} endtime={endtime} filter={filter} 
						maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey}  sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={SvcMeshGroups} /> 
					</>	
				);
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Interconnected Service Group",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<Comp starttime={starttime} endtime={endtime} filter={filter} 
					maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={SvcMeshGroups} />
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

	
// Returns an array of axios configs
function getVirtIPStateProms(record, starttime, endtime)
{
	const			promarr = [];

	if (!record || !record.svcidarr) {
		throw new Error('Record Missing or has unknown format');
	}	

	const			svcidarr = record.svcidarr, nsvc = record.svcidarr.length;
	let			off = 0, ioff = 0;
	
	if (!nsvc) {
		throw new Error('Record has 0 Clustered Services');
	}	

	// We batch in multiples of 16. TODO Optimize the batches by clubbing madhava's and parid's

	outer : for (let i = 0; i < nsvc; i += ioff) {
		const			madset = new Set();
		let			filter = '';

		for (ioff = 0; ioff < 16 && off < nsvc; ++ioff, ++off) {
			const			robj = svcidarr[off];

			if (safetypeof(robj) !== 'object') {
				break outer;
			}	
			
			madset.add(robj.madid);

			filter += `${ioff > 0 ? ' or ' : ''} ( { parid = '${robj.parid}' } and { svcid = '${robj.svcid}' } )`;
		}

		if (!filter || !starttime || ioff === 0) {
			break;
		}	

		const			madfilterarr = [];

		for (let madid of madset) {
			madfilterarr.push(madid);
		}	

		promarr.push(fetchValidate({
			conf : {	
				url 	: NodeApis.extsvcstate,
				method	: 'post',
				data 	: {
					madfilterarr,
					starttime,
					endtime,
					options		:	{
						aggregate	:	starttime && endtime ? true : false,
						aggrsec		:	60,
						aggroper	:	'sum',
						filter		:	filter,
						timeoutsec 	: 	60,
					},
				},
				timeout	: 60000,
			}, 
			validateCB : validateApi,
			desc : 'Service State API',		
		}));
	}	

	if (promarr.length === 0) {
		throw new Error('Record has no Clustered Services');
	}	

	return promarr;
}	
	
function VirtualIPSvcStateTable({record, starttime, endtime, addTabCB, remTabCB, isActiveTabCB, tabKey})
{
	const			[{data, isloading, isapierror}, setApiData] = useState({data : [], isloading : true, isapierror : false});
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		
		if (!record || !isloading) {
			return;
		}	

		(async function() 
		{
			try {
				const			res = await Promise.all(getVirtIPStateProms(record, starttime, endtime));
				const			mres = mergeMultiFetchMadhava(res, 'extsvcstate');

				setApiData({data : svcStateAggrStats(mres.extsvcstate), isloading : false, isapierror : false});
			}
			catch(e) {
				setApiData({data : [], isloading : false, isapierror : true});
				notification.error({message : "Data Fetch Exception Error", 
						description : `Exception occured while waiting for Service IP data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});

				console.log(`Exception caught while waiting for fetch response : ${e}\n${e.stack}\n`);
			}	
		})();

	}, [record, isloading, starttime, endtime]);	
	
	if (isloading === false && isapierror === false) { 
		if (data.timearr.length === 0) {
			hinfo = <Alert type="info" showIcon message="No data found on server..." description=<Empty /> />;
			closetab = 10000;
		}	
		else {
			const			columns = getSvcStateColumns({isrange : true, useAggr : true, aggrType : 'sum', isext : true});
			const			summcolumns = getSvcStateColumns({isrange : true, useAggr : true, aggrType : 'sum', isext : false}).filter((col) => {
							switch (col.dataIndex) {
							
							case 'host' :
							case 'cluster' :
							case 'name' :
							case 'p95resp5s' :
							case 'p95resp5m' :
							case 'inrecs' :
								return false;

							default : return true;	
							}	
						});
			const			svccolumns = columns.filter((col) => {
							switch (col.dataIndex) {
							
							case 'p95resp5s' :
							case 'p95resp5m' :
							case 'inrecs' :
								return false;

							default : return true;	
							}
						});

			const			chgsvcissue = (colarr) => {
							for (let i = 0; i < colarr.length; ++i) {
								let		col = colarr[i];

								if (col.dataIndex === 'svcissue') {
									colarr[i] = { ...col, render :	(num, rec) => <span style={{ color : num > 0 ? 'red' : 'green' }} >{num}</span> };
									break;
								}	
							}	
						};
			chgsvcissue(summcolumns);
			chgsvcissue(svccolumns);

			const			tableOnRow = svcStateOnRow({useAggr : true, aggrMin : 5, addTabCB, remTabCB, isActiveTabCB});
			const			summOnRow = onRowJSONDescribe({titlestr : "Virtual IP Group Summary Statistics", 
								fieldCols : [...aggrsvcstatefields, ...extsvcfields]});

			const 			expandedRowRender = (rec) => <ExtSvcDesc rec={rec} />;

			const			timestr = <span style={{ fontSize : 14, marginTop : 20, marginBottom : 30 }} ><strong> for time range {starttime} to {endtime}</strong></span>;

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >
				<Title level={3}>Virtual IP Grouped Services Aggregated States</Title>
				{timestr}

				<div style={{ marginTop : 30 }}>
				<Title level={4}>Overall Statistics for all Services in Group</Title>
				<GyTable columns={summcolumns} onRow={summOnRow} dataSource={[data.summrec]} rowKey="time" scroll={getTableScroll()} />
				</div>

				<div>
				<Title level={4}>Overall Individual Service Level Statistics</Title>
				<GyTable columns={svccolumns} onRow={tableOnRow} dataSource={data.svcarr} 
					expandable={{ expandedRowRender }} rowKey="svcid" scroll={getTableScroll()} />
				</div>

				<div>
				<Title level={4}>Overall per minute Statistics for all Services</Title>
				<GyTable columns={summcolumns} onRow={summOnRow} dataSource={data.timearr} rowKey="time" scroll={getTableScroll()} />
				</div>


				<div>
				<Title level={4}>Individual Service Level per minute Statistics</Title>
				<GyTable columns={columns} onRow={tableOnRow} dataSource={data.svc1marr} 
					expandable={{ expandedRowRender }} rowKey="rowid" scroll={getTableScroll()} />
				</div>


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

export function SvcVirtualIPGroups({starttime, endtime, filter, maxrecs = 10000, tableOnRow, addTabCB, remTabCB, isActiveTabCB, tabKey, sortColumns, sortDir, recoffset, dataRowsCb})
{
	const 			[{ data, isloading, isapierror }, doFetch] = useFetchApi(null);
	let			hinfo = null, closetab = 0;

	useEffect(() => {
		const conf = 
		{
			url 	: NodeApis.svcipclust,
			method	: 'post',
			data : {
				starttime	: starttime,
				endtime		: endtime,
				qrytime		: Date.now(),
				timeoutsec 	: 60,
				filter		: filter,
				maxrecs		: maxrecs,
				sortcolumns	: sortColumns,
				sortdir		: sortColumns ? sortDir : undefined,
				recoffset       : recoffset > 0 ? recoffset : undefined,
			},
			timeout : 60000,
		};	

		const xfrmresp = (apidata) => {

			validateApi(apidata);

			if ((safetypeof(apidata) !== 'array') || (safetypeof(apidata[0]) !== 'object')) {
				throw new Error("Invalid Data Format seen");
			}	

			mergeSvcIPTimestamps(apidata[0]);

			return apidata[0];
		};

		try {
			doFetch({config : conf, xfrmresp : xfrmresp});
		}
		catch(e) {
			notification.error({message : "Data Fetch Exception Error for Service Virtual IP Group Table", 
						description : `Exception occured while waiting for Service Virtual IP Group Table data : ${e.response ? JSON.stringify(e.response.data) : e.message}`});
			console.log(`Exception caught while waiting for Service Virtual IP Group Table fetch response : ${e}\n${e.stack}\n`);
			return;
		}	

	}, [doFetch, filter, maxrecs, starttime, endtime, sortColumns, sortDir, recoffset]);

	useEffect(() => {
		if (typeof dataRowsCb === 'function') {
			if (isloading === false) { 
			  	
				if (isapierror === false) {
					dataRowsCb(data.svcipclust?.length);
				}
				else {
					dataRowsCb(NaN);
				}	
			}	
		}	
	}, [data, isloading, isapierror, dataRowsCb]);	


	if (isloading === false && isapierror === false) { 
		const			field = "svcipclust";

		if (!data || !data[field]) {
			hinfo = <Alert type="error" showIcon message="Error Encountered" description={"Invalid response received from server..."} />;
			closetab = 30000;
		}
		else {
			let				tstart, tend;

			tstart = moment(starttime, starttime ? moment.ISO_8601 : undefined).subtract(4, 'minute').format();
			tend = moment(endtime ?? starttime, (starttime || endtime) ? moment.ISO_8601 : undefined).add(1, 'minute').format();

			hinfo = (
				<>
				<div style={{ textAlign: 'center', marginTop: 40, marginBottom: 40 }} >

				<Title level={4}>List of Virtual IP Based Service Groups</Title>

				<div style={{ marginBottom : 20 }} > 
					<span ><strong>from {moment(tstart, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss Z")} to 
								{' '} {moment(tend, moment.ISO_8601).format("MMMM Do YYYY HH:mm:ss Z")}</strong></span>
				</div>
				
				<GyTable columns={svcipCol(tstart, tend, addTabCB, remTabCB, isActiveTabCB)} dataSource={data[field]} rowKey="rowid" onRow={tableOnRow} scroll={getTableScroll(700, 500)}  />
				
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
	
export function svcVirtIPTab({starttime, endtime, filter, maxrecs, tableOnRow, addTabCB, remTabCB, isActiveTabCB, modal, title, sortColumns, sortDir, recoffset, wrapComp, dataRowsCb, extraComp = null})
{
	if (starttime || endtime) {

		let mstart = moment(starttime, moment.ISO_8601);

		if (false === mstart.isValid()) {
			notification.error({message : "Virtual IP Service Group Query", description : `Invalid starttime specified : ${starttime}`});
			return;
		}	

		if (endtime) {
			let mend = moment(endtime, moment.ISO_8601);

			if (false === mend.isValid()) {
				notification.error({message : "Virtual IP Service Group Query", description : `Invalid endtime specified : ${endtime}`});
				return;
			}
			else if (mend.unix() < mstart.unix()) {
				notification.error({message : "Virtual IP Service Group Query", description : `Invalid endtime specified : endtime less than starttime : ${endtime}`});
				return;
			}	
		}
	}

	const                           Comp = wrapComp ?? SvcVirtualIPGroups;

	if (!modal) {
		const			tabKey = `SvcState_${Date.now()}`;

		CreateTab(title ?? "Service Group", 
			() => { return (
					<>
					{typeof extraComp === 'function' ? extraComp() : extraComp}
					<Comp starttime={starttime} endtime={endtime} filter={filter} 
						maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
						tabKey={tabKey}  sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={SvcVirtualIPGroups} /> 
					</>	
				);
				}, tabKey, addTabCB);
	}
	else {
		Modal.info({
			title : title ?? "Virtual IP Service Group",

			content : (
				<>
				{typeof extraComp === 'function' ? extraComp() : extraComp}
				<Comp starttime={starttime} endtime={endtime} filter={filter} 
					maxrecs={maxrecs} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tableOnRow={tableOnRow}
					sortColumns={sortColumns} sortDir={sortDir} recoffset={recoffset} dataRowsCb={dataRowsCb} origComp={SvcVirtualIPGroups} />
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

	
export function SvcClusterGroups({starttime, endtime, filter, addTabCB, remTabCB, isActiveTabCB})
{
	const [tstart, setStart]		= useState(starttime);

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
			if ((false === date.isValid()) || (typeof dateString !== 'string')) {
				message.error(`Invalid Historical Date set ${dateString}...`);
				return;
			}	

			tstarttime = dateString;
		}

		const			tabKey = `SvcGroups_${Date.now()}`;
		
		CreateTab('Service Groups', 
			() => { return <SvcClusterGroups starttime={tstarttime} endtime={tendtime} filter={filter}
						addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
					/> }, tabKey, addTabCB);

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	
	
	const onMeshSearch = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs, aggrfilter) => {
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

		// Check filters
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

		svcMeshTab({starttime : tstarttime, endtime : tendtime, filter : fstr, maxrecs, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	

	const timecb = useCallback((ontimecb) => {
		return <TimeRangeAggrModal onChange={ontimecb} title='Select Time or Time Range' showTime={true} showRange={true} minAggrRangeMin={0} disableFuture={true} />;
	}, []);

	const meshfiltercb = useCallback((onfiltercb) => {
		return <SvcMeshFilter filterCB={onfiltercb} />;
	}, []);	

	const onVirtIPSearch = useCallback((date, dateString, useAggr, aggrMin, aggrType, newfilter, maxrecs, aggrfilter) => {
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

		// Check filters
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

		svcVirtIPTab({starttime : tstarttime, endtime : tendtime, filter : fstr, maxrecs, addTabCB, remTabCB, isActiveTabCB, wrapComp : SearchWrapConfig,});

	}, [filter, addTabCB, remTabCB, isActiveTabCB]);	

	const virtipfiltercb = useCallback((onfiltercb) => {
		return <SvcVirtIPFilter filterCB={onfiltercb} />;
	}, []);	

	
	const optionDiv = () => {
		return (
			<div style={{ marginLeft: 30, marginRight: 30, marginBottom : 30, marginTop : 30, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', 
						border: '1px groove #7a7aa0', padding : 10 }} >

			<div>
			<Space>

			<ButtonModal buttontext="Search Interconnected Service Groups" width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onMeshSearch} title="Search Interconnected Service Groups" 
						timecompcb={timecb} filtercompcb={meshfiltercb}  
						ismaxrecs={true} defaultmaxrecs={10000} />
				)} />
					
			<ButtonModal buttontext="Search Virtual IP Service Groups" width={800} okText="Cancel"
				contentCB={() => (
					<SearchTimeFilter callback={onVirtIPSearch} title="Search Virtual IP Service Groups" 
						timecompcb={timecb} filtercompcb={virtipfiltercb}  
						ismaxrecs={true} defaultmaxrecs={10000} />
				)} />
					

			</Space>
			</div>

			<div style={{ marginLeft : 20 }}>
			<Space>

			{!starttime && <Button onClick={() => setStart(moment().startOf('minute').format())} >Refresh Service Groups Info</Button>}

			<TimeRangeAggrModal onChange={onHistorical} title='Historical Service Groups'
					showTime={true} showRange={true} minAggrRangeMin={0} disableFuture={true} />
			</Space>
			</div>

			</div>
		);
	};	
	
	return (
		<>
		<Title level={4}><em>{starttime ? 'Historical ' : ''}Service Groups Dashboard</em></Title>
		{optionDiv()}
		
		<SvcMeshGroups starttime={tstart} endtime={endtime} filter={filter} 
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
				
		<div style={{ marginTop: 40, marginBottom: 40 }} />

		<SvcVirtualIPGroups starttime={tstart} endtime={endtime} filter={filter} 
				addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
		</>		
	);
}

