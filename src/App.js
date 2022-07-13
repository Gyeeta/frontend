
import 			React from 'react';
import 			{Routes, Route} from "react-router-dom";
import 			'antd/dist/antd.css';
import 			'./App.less';
import 			{Alert} from 'antd';
import 			{RecoilRoot} from 'recoil';

import 			{GyeetaTabs, GlobalInit, clusterDashKey, svcDashKey, hostDashKey, procDashKey, alertDashKey, searchKey, gyeetaStatusKey, loginKey} from './gyeetaTabs.js'

const 			{ErrorBoundary} = Alert;

function App()
{
	return (
		<ErrorBoundary>
		<RecoilRoot>
		
		<GlobalInit />

		<Routes>
			<Route path="/" element={<GyeetaTabs />} />
			<Route path="ui/clusterdash" element={<GyeetaTabs startTabKey={clusterDashKey} />} />
			<Route path="ui/hostdash" element={<GyeetaTabs startTabKey={hostDashKey} />} />
			<Route path="ui/svcdash" element={<GyeetaTabs startTabKey={svcDashKey} />} />
			<Route path="ui/procdash" element={<GyeetaTabs startTabKey={procDashKey} />} />
			<Route path="ui/alertdash" element={<GyeetaTabs startTabKey={alertDashKey} />} />
			<Route path="ui/search" element={<GyeetaTabs startTabKey={searchKey} />} />
			<Route path="ui/status" element={<GyeetaTabs startTabKey={gyeetaStatusKey} />} />
			<Route path="ui/login" element={<GyeetaTabs startTabKey={loginKey} />} />

			<Route path="ui/*" element={<GyeetaTabs startTabKey={clusterDashKey} />} />
		</Routes>		

		</RecoilRoot>
		</ErrorBoundary>	
	);
}

export default App;

