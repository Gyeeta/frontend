
import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react';

import {Typography, Space, PageHeader, Tabs, Alert, Modal, Menu, notification} from 'antd';
import {LaptopOutlined, ClusterOutlined, ContainerOutlined, CloudServerOutlined, AlertOutlined, GlobalOutlined, FileDoneOutlined, 
	BranchesOutlined, LineChartOutlined, BarChartOutlined, FilterOutlined, SearchOutlined, PhoneOutlined, SoundOutlined, DeploymentUnitOutlined,
	SafetyOutlined} from '@ant-design/icons';
import {useSearchParams} from 'react-router-dom';
import 	moment from 'moment';
import axios from 'axios';

import './hostViewPage.css';

import {HostDashboard, HostInfoSearch, hostinfofields} from './hostViewPage.js';
import {ClusterDashboard, clusterstatefields, clusterTableTab} from './clusterDashboard.js';
import {ClusterMonitor} from './clusterMonitor.js';
import {SvcDashboard, svcTableTab, svcstatefields, extsvcfields} from './svcDashboard.js';
import {ProcDashboard, procTableTab, procstatefields, extprocfields} from './procDashboard.js';
import {AlertDashboard} from './alertDashboard.js';
import {isEmptyObj} from './components/util.js';
import {hostfields, MultiFilters, GenericSearch} from './multiFilters.js';
import {CPUMemPage} from './cpuMemPage.js';
import {NetDashboard} from './netDashboard.js';
import {HostMonitor} from './hostMonitor.js';
import {SvcHostMonitor} from './svcMonitor.js';
import {SvcClusterGroups} from './svcClusterGroups.js';
import {ProcHostMonitor} from './procMonitor.js';
import {GyeetaStatusTag, GyeetaStatus} from './aboutStatus.js';
import {ActionConfig, ActionDashboard} from './alertActions.js';
import {AlertdefConfig, AlertdefDashboard} from './alertDefs.js';
import {SilenceConfig, SilenceDashboard} from './alertSilences.js';
import {InhibitConfig, InhibitDashboard} from './alertInhibits.js';
import {GlobalAuth, Login, AuthIcon, respErrorIntercept} from './login.js';

const {Title} = Typography;
const {ErrorBoundary} = Alert;
const {TabPane} = Tabs;
const {SubMenu} = Menu;

// NOTE : On adding any tab key also add entry to App.js
export const clusterDashKey = 'clusterDashKey', filtClusterKey = 'filtClusterKey', clusterStateKey = 'clusterStateKey';
export const hostDashKey = 'hostDashKey', filtHostKey = 'filtHostKey', hostCPUKey = 'hostCPUKey', hostStateKey = 'hostStateKey', hostNetFlowKey = 'hostNetFlowKey';
export const svcDashKey = 'svcDashKey', svcClusterKey ='svcClusterKey', svcHostKey = 'svcHostKey', svcMonitorKey = 'svcMonitorKey', svcNetFlowKey = 'svcNetFlowKey', svcGroupKey = 'svcGroupKey';
export const procDashKey = 'procDashKey', procClusterKey = 'procClusterKey', procHostKey = 'procHostKey', procMonitorKey = 'procMonitorKey', procNetFlowKey = 'procNetFlowKey';
export const alertDashKey = 'alertDashKey';
export const alertdefKey = 'alertdefKey', addAlertdefKey = 'addAlertdefKey';
export const actionKey = 'actionKey', addActionKey = 'addActionKey';
export const silenceKey = 'silenceKey', addSilenceKey = 'addSilenceKey';
export const inhibitKey = 'inhibitKey', addInhibitKey = 'addInhibitKey';
export const searchKey = 'searchKey';
export const gyeetaStatusKey = 'gyeetaStatusKey';
export const loginKey = 'loginKey';

export function GlobalInit()
{
	useEffect(() => {
		/*
		 * Global Construction
		 */
		axios.interceptors.request.use(function (config) { config.trequest_ = Date.now(); return config; }, null, { synchronous: true });

		axios.interceptors.response.use(function (response) { return response }, function (error) { return respErrorIntercept(error) });

		return () => {
			/*
			 * Global Destruction
			 */
		};	

	}, []);

	return null;
}	


export function GyeetaTabs({startTabKey = 'clusterDashKey'})
{
	const 		[searchParams, /* setSearchParams */] = useSearchParams();
	const		objref = useRef();

	const 		[activekey, setActiveKey] = useState('');
	const 		[, forceUpdate] = useReducer(x => x + 1, 0);

	if (!objref.current) {
		objref.current 		= {
			panearr		: [],
			timeoutobj	: {},
			activekey 	: '',
			prevtabkey	: '',
			tabwidth	: window.innerWidth > 700 ? window.innerWidth * 0.97 : 700,
			firstTab	: true,
			tmodal		: null,
		};
	}

	const addTabCB = useCallback((title, content, key, closable = true) => {

		for (let i = 0; i < objref.current.panearr.length; ++i) {
			let 		pane = objref.current.panearr[i];

			if (pane.key === key) {
				if (objref.current.activekey !== key) {
					objref.current.activekey = key;
	
					setActiveKey(key);
				}
				
				return;
			}	
		}

		Modal.destroyAll();

		objref.current.tabwidth = (window.innerWidth > 700 ? window.innerWidth * 0.97 : 700);

		let			tab;

		try {
			tab = {
				title : typeof title !== 'function' ? title : title(), 
				content : typeof content !== 'function' ? content : content(),
				key, 
				closable
			};
		}
		catch(e) {
			let		emsg;

			console.log(`Exception seen while creating new tab : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

			if (e.response && e.response.data) {
				emsg = e.response.data;
			}	
			else if (e.message) {
				emsg = e.message;
			}	
			else {
				emsg = 'Exception Caught while creating new tab content';
			}	

			notification.error({message : "Tab Content", description : `Exception during Tab Content creation : ${emsg}`});
			return;
		}	

		objref.current.panearr.push(tab);

		objref.current.prevtabkey = objref.current.activekey;
		objref.current.activekey = key;

		setActiveKey(key);
	}, [objref]);	
	
	// Specify timeoutms to have the tab close after those many msec
	const remTabCB = useCallback((key, timeoutms) => {
		
		let		newactiveid = 0, newactivekey, i, found;
		
		if (objref.current.panearr.length <= 1) {
			return;
		}	

		for (i = 0; i < objref.current.panearr.length; ++i) {
			let 		pane = objref.current.panearr[i];

			if (pane.key === key) {
				found = true;
				newactiveid = i > 0 ? i - 1 : 1;
				break;
			}	
		}

		if (timeoutms > 0 && found) {
			if (objref.current.timeoutobj[key] === undefined) {

				objref.current.timeoutobj[key] = setTimeout(() => {
					try {
						delete objref.current.timeoutobj[key];
						remTabCB(key);
					}
					catch(e) {
					}	
				}, timeoutms);	
			}

			return;
		}	

		if (objref.current.timeoutobj[key]) {
			clearTimeout(objref.current.timeoutobj[key]);
			delete objref.current.timeoutobj[key];
		}	
		
		newactivekey = objref.current.panearr[newactiveid].key;

		const panes = objref.current.panearr.filter(pane => pane.key !== key);
		objref.current.panearr = panes;

		if (objref.current.prevtabkey && objref.current.prevtabkey !== key) {
			for (i = 0; i < objref.current.panearr.length; ++i) {
				let 		pane = objref.current.panearr[i];

				if (pane.key === objref.current.prevtabkey) {
					newactiveid = i;
					newactivekey = objref.current.prevtabkey;
					
					objref.current.prevtabkey = '';
					break;
				}	
			}
		}

		if (objref.current.activekey === newactivekey) {
			forceUpdate();
		}	
		else {
			objref.current.activekey = newactivekey;
			setActiveKey(objref.current.activekey);
		}	

	}, [objref]);	

	const isActiveTabCB = useCallback((key) => {
		return objref.current.activekey === key;
	}, [objref]);	

	const onTabChange = useCallback((activekey) => {
		/*console.log(`onTabChange called : New activekey = ${activekey}`);*/

		objref.current.prevtabkey = objref.current.activekey;
		objref.current.activekey = activekey;

		setActiveKey(activekey);

	}, [objref]);

	const onTabEdit = useCallback((targetKey, action) => {
		/*console.log(`onTabEdit called for targetKey ${targetKey} and action '${action}'`);*/

		if (action === 'remove') {
			remTabCB(targetKey);
		}	
	}, [remTabCB]);	

	const closeModalCB = useCallback((isClosing = true) => {
		if (objref.current.tmodal) {
			// console.log('Closing Tab List Modal...');

			if (!isClosing) {
				objref.current.tmodal.destroy();
			}

			objref.current.tmodal = null;
		}	
	}, [objref])	

	const onMenuClick = useCallback((e, filterobj, name) => {

		switch (e.key) {
		
		case clusterDashKey :
			
			try {

				const		tabKey = clusterDashKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		clusterdash = () => (
					<>
					<ErrorBoundary>
					<ClusterDashboard autoRefresh={filterobj?.endtime ? false : true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
								starttime={filterobj?.starttime} endtime={filterobj?.endtime} filter={filterobj?.filter} />
					</ErrorBoundary>
					</>
				);	
				
				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Clusters', clusterdash, tabKey);
				}	
				else {
					addTabCB('Global Clusters', clusterdash, tabKey);
				}
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Global Cluster Dashboard data : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Cluster Dashboard';
				}	

				notification.error({message : "Cluster Dashboard", description : `Exception during Cluster Dashboard fetch : ${emsg}`});
			}	
			break;
			

		case hostDashKey :
			
			try {

				const		tabKey = hostDashKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		hostdash = () => (
					<>
					<ErrorBoundary>
					<HostDashboard autoRefresh={filterobj?.endtime ? false : true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
								starttime={filterobj?.starttime} endtime={filterobj?.endtime} filter={filterobj?.filter} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Hosts', hostdash, tabKey);
				}	
				else {
					addTabCB('Global Hosts', hostdash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Global Host Dashboard data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Host Dashboard';
				}	

				notification.error({message : "Host Dashboard", description : `Exception during Host Dashboard fetch : ${emsg}`});
			}	
			break;
			

		case svcDashKey :
			
			try {

				const		tabKey = svcDashKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		svcdash = () => (
					<>
					<ErrorBoundary>
					<SvcDashboard autoRefresh={filterobj?.endtime ? false : true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
								starttime={filterobj?.starttime} endtime={filterobj?.endtime} filter={filterobj?.filter} name={name} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Services', svcdash, tabKey);
				}	
				else {
					addTabCB('Global Services', svcdash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Global Service Dashboard data : ${e.message}`);

				if (e.message) {
					emsg = e.message;
				}	
				else if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else {
					emsg = 'Exception Caught while fetching Service Dashboard';
				}	

				notification.error({message : "Service Dashboard", description : `Exception during Service Dashboard fetch : ${emsg}`});
			}	
			break;
			
		case procDashKey :
			
			try {

				const		tabKey = procDashKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		procdash = () => (
					<>
					<ErrorBoundary>
					<ProcDashboard autoRefresh={filterobj?.endtime ? false : true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
								starttime={filterobj?.starttime} endtime={filterobj?.endtime} filter={filterobj?.filter} name={name} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Processes', procdash, tabKey);
				}	
				else {
					addTabCB('Global Processes', procdash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Global Process Dashboard data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Process Dashboard';
				}	

				notification.error({message : "Process Dashboard", description : `Exception during Process Dashboard fetch : ${emsg}`});
			}	
			break;

		case alertDashKey :
			
			try {

				const		tabKey = alertDashKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		alertdash = () => (
					<>
					<ErrorBoundary>
					<AlertDashboard autoRefresh={filterobj?.endtime ? false : filterobj?.filter || true} addTabCB={addTabCB} remTabCB={remTabCB} 
							isActiveTabCB={isActiveTabCB} tabKey={tabKey} starttime={filterobj?.starttime} endtime={filterobj?.endtime} filter={filterobj?.filter} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Alerts', alertdash, tabKey);
				}	
				else {
					addTabCB('Alerts', alertdash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Alerts Dashboard data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Alerts Dashboard';
				}	

				notification.error({message : "Alerts Dashboard", description : `Exception during Alerts Dashboard fetch : ${emsg}`});
			}	
			break;

		case filtClusterKey :

			try {
				const filterCB = (filter) => {
					Modal.destroyAll();

					return onMenuClick({ key : clusterDashKey }, { filter : filter });
				};	

				Modal.info({
					title : <Title level={4}>Select Clusters based on Filters</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={clusterstatefields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Cancel',
					okType : 'default',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Filtered Cluster Dashboard : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Filtered Cluster Dashboard", description : `Exception during Filtered Cluster Dashboard fetch : ${emsg}`});
			}	
			break;

		case filtHostKey :

			try {
				const filterCB = (filter) => {
					Modal.destroyAll();

					return onMenuClick({ key : hostDashKey }, { filter : filter });
				};	

				Modal.info({
					title : <Title level={4}>Set Host Filters</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={hostfields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Cancel',
					okType : 'default',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Filtered Host Dashboard : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Filtered Host Dashboard", description : `Exception during Filtered Host Dashboard fetch : ${emsg}`});
			}	
			break;


		case clusterStateKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.cluster) {
								return;
							}	

							const		tabKey = `clusterState${record.cluster}`;

							const		clustdash = () => (
								<>
								<ErrorBoundary>
								<ClusterMonitor cluster={record.cluster} isRealTime={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} 
										tabKey={tabKey} />		
								</ErrorBoundary>
								</>
							);	

							addTabCB('Cluster Monitor', clustdash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					clusterTableTab({
							filter : filter, 
							modal : true,
							tableOnRow : tableOnRow,
							title : 'Select a cluster to monitor',
						});
				};	

				Modal.confirm({
					title : <Title level={4}>Select Cluster based on Filters</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={clusterstatefields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Cluster List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Filtered Cluster Dashboard : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Filtered Cluster Dashboard", description : `Exception during Filtered Cluster Dashboard fetch : ${emsg}`});
			}	
			break;


		case hostCPUKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.parid) {
								return;
							}	

							const		tabKey = `cpumem${record.parid}`;

							const		cpumemdash = () => (
								<>
								<ErrorBoundary>
								<CPUMemPage parid={record.parid} isRealTime={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} 
										tabKey={tabKey} />		
								</ErrorBoundary>
								</>
							);	

							addTabCB('CPU Memory Monitor', cpumemdash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					Modal.info({
						title : <Title level={4}>Select a Host to monitor</Title>,

						content : <HostInfoSearch filter={filter} tableOnRow={tableOnRow} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
						width : '90%',	
						closable : true,
						destroyOnClose : true,
						maskClosable : true,
						okText : 'Cancel',
						okType : 'default',
					});						
				};	

				Modal.confirm({
					title : <Title level={4}>Select Hosts based on System Info</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={hostinfofields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Host List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Filtered CPU Memory Monitor : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Filtered CPU Memory Monitor", description : `Exception during Monitor data fetch : ${emsg}`});
			}	
			break;

		case hostNetFlowKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.parid) {
								return;
							}	

							const		tabKey = `netflow${record.parid}`;

							const		netflowdash = () => (
								<>
								<ErrorBoundary>
								<NetDashboard parid={record.parid} autoRefresh={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} 
										tabKey={tabKey} />		
								</ErrorBoundary>
								</>
							);	

							addTabCB('Host Net Flow', netflowdash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					Modal.info({
						title : <Title level={4}>Select a Host to monitor</Title>,

						content : <HostInfoSearch filter={filter} tableOnRow={tableOnRow} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
						width : '90%',	
						closable : true,
						destroyOnClose : true,
						maskClosable : true,
						okText : 'Cancel',
						okType : 'default',
					});						
				};	

				Modal.confirm({
					title : <Title level={4}>Select Hosts based on System Info</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={hostinfofields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Host List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Filtered Net Flow Monitor : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Host Net Flow", description : `Exception during Monitor data fetch : ${emsg}`});
			}	
			break;


		case hostStateKey:

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.parid) {
								return;
							}	

							const		tabKey = `hoststate${record.parid}`;

							const		hoststatedash = () => (
								<>
								<ErrorBoundary>
								<HostMonitor parid={record.parid} isRealTime={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} 
										tabKey={tabKey} />		
								</ErrorBoundary>
								</>
							);	

							addTabCB('Hoststate Monitor', hoststatedash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					Modal.info({
						title : <Title level={4}>Select a Host to monitor</Title>,

						content : <HostInfoSearch filter={filter} tableOnRow={tableOnRow} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
						width : '90%',	
						closable : true,
						destroyOnClose : true,
						maskClosable : true,
						okText : 'Cancel',
						okType : 'default',
					});						
				};	

				Modal.confirm({
					title : <Title level={4}>Select Hosts based on System Info</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={hostinfofields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Host List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Host State Monitor : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Host State Monitor", description : `Exception during Monitor data fetch : ${emsg}`});
			}	
			break;


		case svcClusterKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.cluster) {
								return;
							}	

							const		tabKey = `svcdash${record.cluster}`;

							const		svcclustdash = () => (
								<>
								<ErrorBoundary>
								<SvcDashboard autoRefresh={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										filter={`{ cluster = '${record.cluster}' }`} name={`Cluster '${record.cluster}'`} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Cluster Service Dashboard', svcclustdash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					clusterTableTab({
							filter : filter, 
							modal : true,
							tableOnRow : tableOnRow,
							title : 'Select a cluster to monitor',
						});
				};	

				Modal.confirm({
					title : <Title level={4}>Select Cluster based on Filters</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={clusterstatefields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Cluster List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
				
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Cluster Service Dashboard : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Cluster Service Dashboard", description : `Exception during Dashboard fetch : ${emsg}`});
			}	
			break;

		case svcHostKey:

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.parid) {
								return;
							}	

							const		tabKey = `svcdash${record.parid}`;

							const		hostsvcdash = () => (
								<>
								<ErrorBoundary>
								<SvcDashboard autoRefresh={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										parid={record.parid} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Host Service Dashboard', hostsvcdash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					Modal.info({
						title : <Title level={4}>Select a Host to monitor</Title>,

						content : <HostInfoSearch filter={filter} tableOnRow={tableOnRow} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
						width : '90%',	
						closable : true,
						destroyOnClose : true,
						maskClosable : true,
						okText : 'Cancel',
						okType : 'default',
					});						
				};	

				Modal.confirm({
					title : <Title level={4}>Select Hosts based on System Info</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={hostinfofields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Host List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Host Service Dashboard : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Host Service Dashboard", description : `Exception during Dashboard data fetch : ${emsg}`});
			}	
			break;

		case svcMonitorKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.svcid) {
								return;
							}	

							const		tabKey = `svcmon${record.svcid}`;

							const		svcmon = () => (
								<>
								<ErrorBoundary>
								<SvcHostMonitor svcid={record.svcid} parid={record.parid} isRealTime={true} 
										addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Service Monitor', svcmon, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					svcTableTab({
							starttime 	: moment().subtract(3, 'minutes').format(),
							endtime 	: moment().format(),
							useAggr 	: true,
							aggrMin		: 10,
							aggrType	: 'max',	
							filter 		: filter, 
							isext		: true,
							modal 		: true,
							tableOnRow 	: tableOnRow,
							title 		: 'Select a service to monitor',
						});
				};	

				Modal.info({
					title : <Title level={4}>Set Filters based on last 3 minutes max Aggregated Statistics</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={[...hostfields, ...svcstatefields, ...extsvcfields]} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Cancel',
					okType : 'default',
				});	
				
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Service Monitor : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Service Monitor", description : `Exception during data fetch : ${emsg}`});
			}	
			break;

		case svcNetFlowKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.svcid) {
								return;
							}	

							const		tabKey = `svcmon${record.svcid}`;

							const		svcmon = () => (
								<>
								<ErrorBoundary>
								<NetDashboard svcid={record.svcid} svcname={record.name} parid={record.parid} autoRefresh={true} 
										addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Service Net Flow', svcmon, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					svcTableTab({
							starttime 	: moment().subtract(3, 'minutes').format(),
							endtime 	: moment().format(),
							useAggr 	: true,
							aggrMin		: 10,
							aggrType	: 'max',	
							filter 		: filter, 
							isext		: true,
							modal 		: true,
							tableOnRow 	: tableOnRow,
							title 		: 'Select a service to monitor',
						});
				};	

				Modal.info({
					title : <Title level={4}>Set Filters based on last 3 minutes max Aggregated Statistics</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={[...hostfields, ...svcstatefields, ...extsvcfields]} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Cancel',
					okType : 'default',
				});	
				
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Service Netflow Monitor : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Service Netflow Monitor", description : `Exception during data fetch : ${emsg}`});
			}	
			break;

		case svcGroupKey :
			
			try {

				const		tabKey = svcGroupKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		svcGroups = () => (
					<>
					<ErrorBoundary>
					<SvcClusterGroups starttime={filterobj?.starttime} endtime={filterobj?.endtime} filter={filterobj?.filter} 
								addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Svc Groups', svcGroups, tabKey);
				}	
				else {
					addTabCB('Service Groups', svcGroups, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Service Groups data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Service Groups';
				}	

				notification.error({message : "Service Groups", description : `Exception during data fetch : ${emsg}`});
			}	
			break;

		case procClusterKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.cluster) {
								return;
							}	

							const		tabKey = `procdash${record.cluster}`;

							const		procclustdash = () => (
								<>
								<ErrorBoundary>
								<ProcDashboard autoRefresh={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										filter={`{ cluster = '${record.cluster}' }`} name={`Cluster '${record.cluster}'`} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Cluster Process Dashboard', procclustdash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					clusterTableTab({
							filter : filter, 
							modal : true,
							tableOnRow : tableOnRow,
							title : 'Select a cluster to monitor',
						});
				};	

				Modal.confirm({
					title : <Title level={4}>Select Cluster based on Filters</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={clusterstatefields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Cluster List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
				
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Cluster Process Dashboard : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Cluster Process Dashboard", description : `Exception during Dashboard fetch : ${emsg}`});
			}	
			break;

		case procHostKey:

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.parid) {
								return;
							}	

							const		tabKey = `procdash${record.parid}`;

							const		hostprocdash = () => (
								<>
								<ErrorBoundary>
								<ProcDashboard autoRefresh={true} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey}
										parid={record.parid} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Host Process Dashboard', hostprocdash, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					Modal.info({
						title : <Title level={4}>Select a Host to monitor</Title>,

						content : <HostInfoSearch filter={filter} tableOnRow={tableOnRow} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />,
						width : '90%',	
						closable : true,
						destroyOnClose : true,
						maskClosable : true,
						okText : 'Cancel',
						okType : 'default',
					});						
				};	

				Modal.confirm({
					title : <Title level={4}>Select Hosts based on System Info</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={hostinfofields} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Get Complete Host List',
					onOk : () => filterCB(),
					okType : 'primary',
					cancelType : 'primary',
				});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Host Process Dashboard : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Host Service Dashboard", description : `Exception during Dashboard data fetch : ${emsg}`});
			}	
			break;

		case procMonitorKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.procid) {
								return;
							}	

							const		tabKey = `procmon${record.procid}`;

							const		procmon = () => (
								<>
								<ErrorBoundary>
								<ProcHostMonitor procid={record.procid} parid={record.parid} isRealTime={true} 
										addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Process Monitor', procmon, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					procTableTab({
							starttime 	: moment().subtract(3, 'minutes').format(),
							endtime 	: moment().format(),
							useAggr 	: true,
							aggrMin		: 10,
							aggrType	: 'max',	
							filter 		: filter, 
							isext		: true,
							modal 		: true,
							tableOnRow 	: tableOnRow,
							title 		: 'Select a process to monitor',
						});
				};	

				Modal.info({
					title : <Title level={4}>Set Filters based on last 3 minutes max Aggregated Statistics</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={[...hostfields, ...procstatefields, ...extprocfields]} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Cancel',
					okType : 'default',
				});	
				
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Process Monitor : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Process Monitor", description : `Exception during data fetch : ${emsg}`});
			}	
			break;

		case procNetFlowKey :

			try {
				const tableOnRow = (record, rowIndex) => {
					return {
						onClick: event => {
							
							Modal.destroyAll();
							
							if (!record || !record.procid) {
								return;
							}	

							const		tabKey = `procmon${record.procid}`;

							const		procmon = () => (
								<>
								<ErrorBoundary>
								<NetDashboard procid={record.procid} procname={record.name} parid={record.parid} autoRefresh={true} 
										addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
								</ErrorBoundary>
								</>
							);	

							addTabCB('Process Net Flow', procmon, tabKey);
						}	
					};	
				};	

				const filterCB = (filter) => {
					procTableTab({
							starttime 	: moment().subtract(3, 'minutes').format(),
							endtime 	: moment().format(),
							useAggr 	: true,
							aggrMin		: 10,
							aggrType	: 'max',	
							filter 		: filter, 
							isext		: true,
							modal 		: true,
							tableOnRow 	: tableOnRow,
							title 		: 'Select a process to monitor',
						});
				};	

				Modal.info({
					title : <Title level={4}>Set Filters based on last 3 minutes max Aggregated Statistics</Title>,

					content : <MultiFilters filterCB={filterCB} filterfields={[...hostfields, ...procstatefields, ...extprocfields]} />,
					width : '80%',	
					closable : true,
					destroyOnClose : true,
					maskClosable : true,
					okText : 'Cancel',
					okType : 'default',
				});	
				
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Process Netflow Monitor : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Process Netflow Monitor", description : `Exception during data fetch : ${emsg}`});
			}	
			break;


		case actionKey :
			
			try {

				const		tabKey = actionKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		actiondash = () => (
					<>
					<ErrorBoundary>
					<ActionDashboard filter={filterobj?.filter} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Actions', actiondash, tabKey);
				}	
				else {
					addTabCB('Alert Actions', actiondash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Actions Dashboard data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Alert Actions';
				}	

				notification.error({message : "Alert Actions", description : `Exception during data fetch : ${emsg}`});
			}	
			break;


		case addActionKey :

			try {
				objref.current.tmodal = Modal.info({
							title : <Title level={4}><em>New Alert Action</em></Title>,
							content : <ActionConfig doneCB={() => setTimeout(() => closeModalCB(false), 1000)} />,
							width : '90%',	
							closable : true,
							destroyOnClose : true,
							maskClosable : false,
							okText : 'Cancel',
							okType : 'primary',
							onOk : closeModalCB,
					});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Add Alert Action : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Add Alert Action", description : `Exception seen : ${emsg}`});
			}	
			break;

		case alertdefKey :
			
			try {

				const		tabKey = alertdefKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		alertdefdash = () => (
					<>
					<ErrorBoundary>
					<AlertdefDashboard filter={filterobj?.filter} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Alertdefs', alertdefdash, tabKey);
				}	
				else {
					addTabCB('Alert Definitions', alertdefdash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Alert Definitions Dashboard data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Alert Definitions';
				}	

				notification.error({message : "Alert Definitions", description : `Exception during data fetch : ${emsg}`});
			}	
			break;


		case addAlertdefKey :

			try {
				const		tabKey = addAlertdefKey;

				const		adeftab = () => (
					<>
					<ErrorBoundary>
					<AlertdefConfig addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} doneCB={() => setTimeout(() => remTabCB(tabKey), 3000)} />
					</ErrorBoundary>
					</>
				);	

				addTabCB('New Alertdef', adeftab, tabKey);
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Add Alert Definition : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Add Alert Definition", description : `Exception seen : ${emsg}`});
			}	
			break;


		case silenceKey :
			
			try {

				const		tabKey = silenceKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		silencedash = () => (
					<>
					<ErrorBoundary>
					<SilenceDashboard filter={filterobj?.filter} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Silences', silencedash, tabKey);
				}	
				else {
					addTabCB('Alert Silences', silencedash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Silences Dashboard data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Alert Silences';
				}	

				notification.error({message : "Alert Silences", description : `Exception during data fetch : ${emsg}`});
			}	
			break;


		case addSilenceKey :

			try {
				objref.current.tmodal = Modal.info({
							title : <Title level={4}><em>New Alert Silence</em></Title>,
							content : <SilenceConfig doneCB={() => setTimeout(() => closeModalCB(false), 1000)} />,
							width : '90%',	
							closable : true,
							destroyOnClose : true,
							maskClosable : false,
							okText : 'Cancel',
							okType : 'primary',
							onOk : closeModalCB,
					});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Add Silence : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Add Alert Silence", description : `Exception seen : ${emsg}`});
			}	
			break;

		case inhibitKey :
			
			try {

				const		tabKey = inhibitKey + ((filterobj && !isEmptyObj(filterobj, true)) ? `_dashfiltered${Date.now()}` : '');

				const		inhibitdash = () => (
					<>
					<ErrorBoundary>
					<InhibitDashboard filter={filterobj?.filter} />
					</ErrorBoundary>
					</>
				);	

				if (filterobj && !isEmptyObj(filterobj, true)) {
					addTabCB('Filtered Inhibits', inhibitdash, tabKey);
				}	
				else {
					addTabCB('Alert Inhibits', inhibitdash, tabKey);
				}	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while fetching Inhibits Dashboard data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while fetching Alert Inhibits';
				}	

				notification.error({message : "Alert Inhibits", description : `Exception during data fetch : ${emsg}`});
			}	
			break;


		case addInhibitKey :

			try {
				objref.current.tmodal = Modal.info({
							title : <Title level={4}><em>New Alert Inhibit</em></Title>,
							content : <InhibitConfig doneCB={() => setTimeout(() => closeModalCB(false), 1000)} />,
							width : '90%',	
							closable : true,
							destroyOnClose : true,
							maskClosable : false,
							okText : 'Cancel',
							okType : 'primary',
							onOk : closeModalCB,
					});	
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen for Add Inhibit : ${e.response ? JSON.stringify(e.response.data) : e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught';
				}	

				notification.error({message : "Add Alert Inhibit", description : `Exception seen : ${emsg}`});
			}	
			break;


		case searchKey :
			
			try {

				/*
				 * We allow upto 3 tabs to allow 3 separate Search params...
				 */
				const		sid = Date.now() % 3 + 1; 
				const		tabKey = searchKey + sid;

				const		searchpage = () => (
					<>
					<ErrorBoundary>
					<GenericSearch addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
					</ErrorBoundary>
					</>
				);	

				addTabCB(`Search ${sid}`, searchpage, tabKey);
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while handling Generic Search data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while handling Generic Search';
				}	

				notification.error({message : "Generic Search", description : `Exception seen : ${emsg}`});
			}	
			break;

		case gyeetaStatusKey :
			
			try {

				const		tabKey = gyeetaStatusKey;

				const		statuspage = () => (
					<>
					<ErrorBoundary>
					<GyeetaStatus addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
					</ErrorBoundary>
					</>
				);	

				addTabCB('Gyeeta Status', statuspage, tabKey);
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while handling Gyeeta Status data : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while handling Gyeeta Status';
				}	

				notification.error({message : "Gyeeta Status", description : `Exception seen : ${emsg}`});
			}	
			break;

		case loginKey :
			
			try {

				// Add a fallback tab
				onMenuClick({ key : clusterDashKey });

				const		tabKey = loginKey;

				const		statuspage = () => (
					<>
					<ErrorBoundary>
					<Login addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} />
					</ErrorBoundary>
					</>
				);	

				addTabCB('Login', statuspage, tabKey);
			}
			catch(e) {
				let		emsg;

				console.log(`Exception seen while creating Login Tab : ${e.message}`);

				if (e.response && e.response.data) {
					emsg = e.response.data;
				}	
				else if (e.message) {
					emsg = e.message;
				}	
				else {
					emsg = 'Exception Caught while creating Login Tab';
				}	

				notification.error({message : "Login", description : `Exception seen : ${emsg}`});
			}	
			break;


		default :
			break;
			
		}	
	}, [addTabCB, isActiveTabCB, remTabCB, closeModalCB]);	


	useEffect(() => {
		console.log(`Starting First Tab content...`);

		let			startKey = startTabKey, filterobj;

		if (objref.current.firstTab) {
			objref.current.firstTab = false;

			filterobj = {};

			const		pstarttime 	= searchParams.get('starttime')
			const		pendtime 	= searchParams.get('endtime')
			const		pfilter  	= searchParams.get('filter')
			

			if (pstarttime) {
				filterobj.starttime = pstarttime;
			}	

			if (pendtime) {
				filterobj.endtime = pendtime;
			}	

			if (pfilter) {
				filterobj.filter = pfilter;
			}	
		}

		switch (startKey) {

		case clusterDashKey : 
		case procDashKey :
		case svcDashKey :
		case hostDashKey :
		case alertDashKey :
		case searchKey :
		case gyeetaStatusKey :
		case loginKey :
			break;

		default :
			startKey = clusterDashKey;
			break;
		}	
		
		onMenuClick({ key : startKey }, filterobj);

	}, [objref, addTabCB, remTabCB, isActiveTabCB, onTabChange, onMenuClick, startTabKey, searchParams]);	

	const pgMenu = useMemo(() => {
		return (
			<PageHeader backIcon={false} ghost={false} 
				title={<><span style={{ fontSize : 24, color : '#c193c3e6' }}><em>G</em></span><span style={{ fontSize : 18, color : '#a0c1d3ba' }}><em>yeeta</em></span></>} 
				avatar={{ src: '/gyeeta.png', size : 'large' }} 
				extra={
					<>
					<Space size="large" >
					
					<GyeetaStatusTag autoRefresh={true} refreshSec={45} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
					<AuthIcon  addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />
					
					</Space>
					</>
				} >

				<>
				<div style={{ marginBottom : 15 }} >

				<Menu onClick={onMenuClick} mode="horizontal" style={{ background: '#1a1818'}} >

				<SubMenu key="ClusterMenu" icon={<ClusterOutlined />} title="Clusters">
					<Menu.Item key={clusterDashKey} icon={<GlobalOutlined />}>Global Cluster Dashboard</Menu.Item>
					<Menu.Item key={filtClusterKey} icon={<FilterOutlined />}>Filtered Cluster Dashboard</Menu.Item>
					<Menu.Item key={clusterStateKey} icon={<LineChartOutlined />} >Specific Cluster State Monitor</Menu.Item>
				</SubMenu>

				<SubMenu key="HostsMenu" icon={<LaptopOutlined />} title="Hosts">
					<Menu.Item key={hostDashKey} icon={<GlobalOutlined />}>Global Hosts Dashboard</Menu.Item>
					<Menu.Item key={filtHostKey} icon={<FilterOutlined />}>Filtered Hosts Dashboard</Menu.Item>
					<Menu.Item key={hostCPUKey} icon={<LineChartOutlined />} >Specific Host CPU/Memory Monitor</Menu.Item>
					<Menu.Item key={hostStateKey} icon={<BarChartOutlined />} >Host State Monitor</Menu.Item>
					<Menu.Item key={hostNetFlowKey} icon={<BranchesOutlined />} >Host Network Flow Dashboard</Menu.Item>
				</SubMenu>

				<SubMenu key="SvcMenu" icon={<CloudServerOutlined />} title="Services">
					<Menu.Item key={svcDashKey} icon={<GlobalOutlined />} >Global Service Dashboard</Menu.Item>
					<Menu.Item key={svcClusterKey} icon={<ClusterOutlined />}>Service Dashboard for Cluster</Menu.Item>
					<Menu.Item key={svcHostKey} icon={<LaptopOutlined />}>Service Dashboard for Host</Menu.Item>
					<Menu.Item key={svcMonitorKey} icon={<LineChartOutlined />} >Specific Service Monitor</Menu.Item>
					<Menu.Item key={svcNetFlowKey} icon={<BranchesOutlined />} >Service Network Flow Dashboard</Menu.Item>
					<Menu.Item key={svcGroupKey} icon={<DeploymentUnitOutlined />} >Service Deployment Groups</Menu.Item>
				</SubMenu>
				
				<SubMenu key="ProcMenu" icon={<ContainerOutlined />} title="Processes">
					<Menu.Item key={procDashKey} icon={<GlobalOutlined />} >Global Process Dashboard</Menu.Item>
					<Menu.Item key={procClusterKey} icon={<ClusterOutlined />}>Process Dashboard for Cluster</Menu.Item>
					<Menu.Item key={procHostKey} icon={<LaptopOutlined />}>Process Dashboard for Host</Menu.Item>
					<Menu.Item key={procMonitorKey} icon={<LineChartOutlined />} >Specific Process Monitor</Menu.Item>
					<Menu.Item key={procNetFlowKey} icon={<BranchesOutlined />} >Process Network Flow Dashboard</Menu.Item>
				</SubMenu>

				<SubMenu key="AlertMenu" icon={<AlertOutlined />} title="Alerts">
					<Menu.Item key={alertDashKey} icon={<AlertOutlined />}> Alerts Dashboard</Menu.Item>
				
					<Menu.ItemGroup title="Existing...">
						<Menu.Item key={alertdefKey} icon={<FileDoneOutlined />}> Alert Definitions</Menu.Item>
						<Menu.Item key={actionKey} icon={<PhoneOutlined />} > Actions </Menu.Item>
						<Menu.Item key={silenceKey} icon={<SoundOutlined />} > Silences </Menu.Item>
						<Menu.Item key={inhibitKey} icon={<FilterOutlined />}> Inhibits </Menu.Item>
					</Menu.ItemGroup>

					<Menu.ItemGroup title="Add New...">
						<Menu.Item key={addAlertdefKey} icon={<FileDoneOutlined />}> New Alert Definition</Menu.Item>
						<Menu.Item key={addActionKey} icon={<PhoneOutlined />} > New Action </Menu.Item>
						<Menu.Item key={addSilenceKey} icon={<SoundOutlined />} > New Silence </Menu.Item>
						<Menu.Item key={addInhibitKey} icon={<FilterOutlined />} > New Inhibit </Menu.Item>
					</Menu.ItemGroup>

				</SubMenu>

				<Menu.Item key={searchKey} icon={<SearchOutlined />}>Search</Menu.Item>

				<Menu.Item key={gyeetaStatusKey} icon={<SafetyOutlined />}>Status</Menu.Item>

				</Menu>

				</div>
				</>
			</PageHeader>
		);
	}, [onMenuClick, addTabCB, remTabCB, isActiveTabCB]);	
	
	return (
		<>
		<div style={{ marginLeft : 10, marginTop : 10, marginRight : 10, marginBottom : 20, width: objref.current.tabwidth + 10 }} >

		<Space direction="vertical">
		
		{pgMenu}
			
		<div>

		<GlobalAuth addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />

		<Tabs hideAdd onChange={onTabChange} activeKey={activekey} type="editable-card" onEdit={onTabEdit} tabBarStyle={{ width: objref.current.tabwidth - 30 }} >
			{objref.current.panearr.map(pane => (
				<TabPane tab={pane.title} key={pane.key} closable={pane.closable}> 
					<>
						<div style={{ padding: 10, marginBottom : 10, width: objref.current.tabwidth, minHeight : 700, margin : 'auto' }} >
						{pane.content} 
						</div>
					</>
				</TabPane>
			))}
		</Tabs>

		</div>

		</Space>

		</div>

		<div style={{ height: 40, textAlign : 'center' }}>
		<>
		<span><i>Copyright Exact Solutions, Inc. </i>Learn more about <i><strong>Gyeeta</strong></i> along with documentation at : </span>
		<a href="https://gyeeta.io" target="_blank" rel="noopener noreferrer">{'https://gyeeta.io'}</a>
		</>
		</div>

		</>
	);


}

