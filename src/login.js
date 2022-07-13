

import 			React, {useState, useEffect} from 'react';
import			{Button, Input, Alert, Form, Typography, Modal, Descriptions, Tooltip, Popover, notification} from 'antd';
import 			{UserOutlined, LockOutlined, LogoutOutlined} from '@ant-design/icons';

import 			axios from 'axios';
import 			{atom, useRecoilState, useSetRecoilState, useRecoilValue} from 'recoil';

import 			{NodeApis} from './components/common.js';
import 			{safetypeof, CreateTab} from './components/util.js';
import			{loginKey} from './gyeetaTabs.js';

const 			{ErrorBoundary} = Alert;
const 			{Title} = Typography;

let			gsetAuthAtom = null, gatomTime = 0, gatomtstart = 0;

export const authAtom = atom({
	key		: 	'auth',

	// initial state from local storage 
	default 	: 	function() {
					const			uinfo = localStorage.getItem('userinfo');

					if (!uinfo) {
						return null;
					}

					try {
						const 		user = JSON.parse(uinfo);
						
						if (user.token) {
							axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
							return user;
						}	
					}
					catch(e) {
					}	

					localStorage.removeItem('userinfo');
					
					return null;
				}(),					
});

export function logout()
{
	if (axios.defaults.headers.common['Authorization']) {
		axios.defaults.headers.common['Authorization'] = '';
	}

	localStorage.removeItem('userinfo');

	if (typeof gsetAuthAtom === 'function') {
		gsetAuthAtom(null);
	}	
}	

export function respErrorIntercept(error)
{
	if (error && error.response) {
		const 			status = error.response.status;

		if (status === 401) {
			if (gatomTime < error.config?.trequest_ && gatomtstart < error.config.trequest_) {
				logout();
			}
		}
	}

	return Promise.reject(error);
}



// Basic Login Form
export function Login({addTabCB, remTabCB, isActiveTabCB, tabKey = loginKey})
{
	const setAuthAtom		= useSetRecoilState(authAtom);

	const onFinish = async (obj) => {

		const conf = {
			url 	: NodeApis.basicauth,
			method	: 'post',
			data 	: obj,
			timeout : 30 * 1000,
		};	

		if (axios.defaults.headers.common['Authorization']) {
			axios.defaults.headers.common['Authorization'] = '';
		}

		localStorage.removeItem('userinfo');

		setAuthAtom(null);
		
		gatomtstart = Date.now();

		try {
			const 			res = await axios(conf);
			const			data = res.data;

			if (safetypeof(data) !== 'object') {
				Modal.error({
					title 	: 'Login Successful but Response unknown',
					content : `Server Returned Unknown Response : ${JSON.stringify(data)}`,
				});
			}	
			else {
				gatomTime = Date.now();

				const			msg = `Logged in with User '${data.user}' with '${data.effrole}' role`;

				notification.success({message : "Login Successful", description : msg});
				
				localStorage.setItem('userinfo', JSON.stringify(data));
				
				setAuthAtom(data);
				
				console.log(msg);
			}	

			remTabCB(tabKey);
		}
		catch(e) {
			Modal.error({
				title 	: 'Login Failure',
				content : `Server Returned : ${e.response ? JSON.stringify(e.response.data) : e.message}`,
			});

			console.log(`Exception caught while waiting for Login response : ${e}\n${e.stack}\n`);
		}	
	};

	return (
		<>

		<ErrorBoundary>

		<Title level={4}><em>Gyeeta Login</em></Title>

		<div style={{ width : 300, marginTop : 60, marginLeft : 100, marginBottom : 40 }} >

		<span style={{ fontSize : 16, marginBottom : 90 }}><strong><em>Please Enter Gyeeta Login Credentials</em></strong></span>

		<img src="gyeeta.png" alt="Gyeeta" width="300" height="200" />

		<div style={{ marginTop : 40 }} />

		<Form name="basiclogin" onFinish={onFinish} >

		<Form.Item name="username" rules={[ { required : true, message : 'Please input your Username!', }, ]} >
			<Input prefix={<UserOutlined />} placeholder="Username" />
		</Form.Item>

		<Form.Item name="password" rules={[ { required : true, message : 'Please input your Password!', }, ]} >
			<Input prefix={<LockOutlined />} type="password" placeholder="Password" />
		</Form.Item>
		
		<Form.Item>
			<Button type="primary" htmlType="submit" style={{ width : '100%' }} >Log in </Button>
		</Form.Item>

		</Form>

		</div>

		</ErrorBoundary>

		</>
	);		
}	

export function createLoginTab({addTabCB, remTabCB, isActiveTabCB, tabKey = loginKey})
{
	CreateTab('Login', () => { return <Login addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} tabKey={tabKey} /> }, tabKey, addTabCB);
}

function AuthInfo({authtoken, addTabCB, remTabCB, isActiveTabCB})
{
	if (!authtoken) {
		return null;
	}

	return (
		<>
		<ErrorBoundary>

		<div style={{ border : '1px solid', width : 400, marginBottom : 30 }} >

		<Descriptions title="Authentication Info" bordered={true} column={1} style={{ textAlign: 'center' }}>
			{authtoken.user && <Descriptions.Item label={<em>Username</em>}>{authtoken.user}</Descriptions.Item>}
			{authtoken.effrole && <Descriptions.Item label={<em>Effective Role</em>}>{authtoken.effrole}</Descriptions.Item>}
			{authtoken.authType && <Descriptions.Item label={<em>Auth Mechanism</em>}>{authtoken.authType}</Descriptions.Item>}
		</Descriptions>

		</div>

		<Button shape="round" style={{ width : '100%' }} onClick={logout}  icon={<LogoutOutlined />} >Log Out</Button>

		</ErrorBoundary>
		</>
	);
}	

export function AuthIcon({addTabCB, remTabCB, isActiveTabCB})
{
	const authtoken		= useRecoilValue(authAtom);

	if (!authtoken) {
		return (
			<Tooltip title={<span style={{ color : 'pink' }} >Log In to continue</span>} >
			<Button shape="circle" icon={<UserOutlined style={{ color : "red" }} />} onClick={() => {createLoginTab({addTabCB, remTabCB, isActiveTabCB})}} />
			</Tooltip>
		);	
	}	

	return (
		<>
		<ErrorBoundary>
		
		<Popover placement="bottomRight" content={<AuthInfo authtoken={authtoken} addTabCB={addTabCB} remTabCB={remTabCB} isActiveTabCB={isActiveTabCB} />} >
			
			<Button shape="circle" icon={<UserOutlined style={{ color : "blue" }} />} />
		</Popover>

		</ErrorBoundary>
		</>
	);
}	

export function GlobalAuth({addTabCB, remTabCB, isActiveTabCB})
{
	const [authtoken, setAuthtoken]	= useRecoilState(authAtom);
	const [authType, setAuthType] 	= useState();
	
	if (typeof addTabCB !== 'function') {
		throw new Error(`Invalid addTabCB prop specified for GlobalAuth`);
	}	

	if (typeof remTabCB !== 'function') {
		throw new Error(`Invalid remTabCB prop specified for GlobalAuth`);
	}	

	if (typeof isActiveTabCB !== 'function') {
		throw new Error(`Invalid isActiveTabCB prop specified for GlobalAuth`);
	}	

	useEffect(() => {
		axios.get(NodeApis.authType)
			.then((resp) => {
				if (typeof resp.data === 'string') {
					setAuthType(resp.data);
				}	
				else {
					setAuthType('unknown');
				}	
			})
			.catch((error) => {
				setAuthType('error');
			});	

		return () => {
			gsetAuthAtom = null;
		};	
	}, []);	

	useEffect(() => {
		let 			iscancelled = false;

		if (!authType) {
			return;
		}	

		if (!authtoken && authType === 'basic') {
			createLoginTab({addTabCB, remTabCB, isActiveTabCB});
			return;
		}

		if (authtoken) {
			if (!gsetAuthAtom) {
				gsetAuthAtom = setAuthtoken;
			}

			if (authtoken.token) {
				axios.defaults.headers.common['Authorization'] = `Bearer ${authtoken.token}`;
			}
			else {
				axios.defaults.headers.common['Authorization'] = '';
			}	
		}	

		/*
		 * The below call is primarily for oauth2 proxy mode where the HTTP cookie will be used
		 */
		if (!authtoken || !authtoken.islogininfo_) { 
			axios.get(NodeApis.loginuserinfo)
				.then(resp => {
					if (!iscancelled && safetypeof(resp.data) === 'object') {
						const		tauth = authtoken ?? {};
						const		newauth = {
							...tauth,
							...resp.data,
							islogininfo_ : true,
						};	
						
						setAuthtoken(newauth);
					}
				})
				.catch(e => {
					console.log(`Failed to get loginuserinfo : ${e}`);
				});	
		}	

		return () => {
			iscancelled = true;
		};

	}, [authtoken, authType, addTabCB, remTabCB, isActiveTabCB, setAuthtoken]);	

	return null;
}	

