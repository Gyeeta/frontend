
import React, { useState, useRef, useEffect, useCallback, useMemo }  from 'react';
import {DatePicker, Select, Radio, Space, Switch, InputNumber, Typography, Modal, Button, message} from 'antd';

import moment from 'moment-timezone';

import {safetypeof, ButtonModal} from './util.js';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;

export const tzOffsetsArray = [
	"-12:00", "-11.00", "-10:00", "-09:30", "-09:00", "-08:00", "-07:00", "-06:00", "-05:00", "-04:00", "-03:30", "-03:00", "-02:00", "-01:00", 
	"+00:00",  "UTC", 
	"+01:00", "+02:00", "+03:00", "+03:30", "+04:00", "+04:30", "+05:00", "+05:30", "+05:45", "+06:00", "+06:30", "+07:00", "+08:00", "+08:45", 
	"+09:00", "+10:00", "+10:30", "+11:00", "+12:00", "+12:45", "+13:00", "+14:00"
];

export const tzNamesArray = moment.tz.names();

export function TimezonePicker({onChange, defaultTZ})
{
	return (
		<Select showSearch style={{ width: 250 }} defaultValue={defaultTZ} onChange={onChange} optionFilterProp="children" 
			filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0 } >
			{tzNamesArray.map(item => (
				<Select.Option key={item} value={item}>
					{item}
				</Select.Option>
			))}
		</Select>
	);
}	

// We allow 24 hour in future to account for timezone differences
export function disableFutureTimes(current)
{
	return current && current.unix() >= Date.now()/1000 + 24 * 3600;
}

export function disablePastTimes(current)
{
	return current && current.unix() < Date.now()/1000 + 60;
}


export function DateTimeZonePicker({onChange, cbonreset, autoResetSeconds, disableFuture, disabledDate, placeholder, ...props})
{
	const		objref = useRef(null);
	const 		[tz, setTZ] = useState(moment().tz() || moment.tz.guess());
	const		[datetimestr, setDateTime] = useState('');
	const		[datetimetzobj, setDateObj] = useState(null);
	
	if (objref.current === null) {
		objref.current = {
			tzname		: tz,
			tzutcoff	: moment().format().slice(19),
		};	
	}

	const onDateChange = useCallback((date, dateString) => {
		if (0 === dateString.length) {
			setDateObj(null);
			setDateTime('');
			return;
		}

		const			munix = Date.now()/1000;

		if (date.unix() >=  munix - 5 && date.unix() <= munix + 5)  {
			setDateObj(date);
			setDateTime(date.format());
			
			return;
		}

		const newdateString = dateString.slice(0, 19) + objref.current.tzutcoff;

		/*console.log(`onDateChange called : dateString is ${dateString} calculated newdateString is ${newdateString}`);*/
		
		setDateObj(moment(newdateString, moment.ISO_8601));
		setDateTime(newdateString);

	}, [objref]);	

	const onTZChange = useCallback((newtz) => {
		/*console.log(`onTZChange called : new tz is ${newtz}`);*/

		moment.tz.setDefault(newtz);

		objref.current.tzname 	= newtz;
		objref.current.tzutcoff	= moment().format().slice(19);	

		setTZ(newtz);

	}, [objref]);	

	const memoTZ = useMemo(() => {
		return (
			<>
			<span>Timezone </span>
			<TimezonePicker defaultTZ={tz} onChange={onTZChange} />
			</>
		);	
	}, [tz, onTZChange]);	

	useEffect(() => {
		let		timer1 = 0;

		if (tz.length && datetimestr.length && datetimetzobj && datetimetzobj.isValid()) {
			if (typeof onChange === 'function') {
				onChange(datetimetzobj, datetimestr);
			}	

			if (typeof autoResetSeconds === 'number' && autoResetSeconds > 0) {
				timer1 = setTimeout(() => {
					/*console.log('Autoreset timer : clearing date...');		*/
					onDateChange(null, '');
				}, autoResetSeconds * 1000);
			}	
		}
		else if (!datetimetzobj && cbonreset && typeof onChange === 'function') {
			onChange(datetimetzobj, datetimestr);
		}	

		return () => { 
			if (timer1) clearTimeout(timer1);
		}
	}, [tz, datetimestr, datetimetzobj, onChange, autoResetSeconds, onDateChange, cbonreset]);

	return (
		<DatePicker {...props} format="YYYY-MM-DD HH:mm:ss" showTime placeholder={placeholder ?? "Select Timestamp"}
			value={datetimestr.length ? datetimetzobj : undefined} onChange={onDateChange} renderExtraFooter={() => memoTZ} 
			disabledDate={disabledDate ?? (disableFuture ? disableFutureTimes : undefined)} />
	);
}	

export function RangeTimeZonePicker({onChange, cbonreset, autoResetSeconds, disableFuture, disabledDate, placeholder, ...props})
{
	const		objref = useRef(null);
	const 		[tz, setTZ] = useState(moment().tz() || moment.tz.guess());
	const		[datetimestrs, setDateTimes] = useState(['', '']);
	const		[datetimetzobjs, setDateObjs] = useState([null, null]);

	if (objref.current === null) {
		objref.current = {
			tzname		: tz,
			tzutcoff	: moment().format().slice(19),
		};	
	}

	const onDatesChange = useCallback((dates, dateStrings) => {
		if (0 === dateStrings[0].length) {
			setDateObjs([null, null]);
			setDateTimes(['', '']);
			return;
		}

		const newdateString0 = dateStrings[0].slice(0, 19) + objref.current.tzutcoff;
		const newdateString1 = dateStrings[1].slice(0, 19) + objref.current.tzutcoff;

		/*console.log(`onDateChange called : dateStrings are ${dateStrings[0]} and ${dateStrings[1]} calculated newdateStrings is ${newdateString0} and ${newdateString1}`);*/
		
		setDateObjs([moment(newdateString0, moment.ISO_8601), moment(newdateString1, moment.ISO_8601)]);
		setDateTimes([newdateString0, newdateString1]);

	}, []);	

	const onTZChange = useCallback((newtz) => {
		moment.tz.setDefault(newtz);

		objref.current.tzname 	= newtz;
		objref.current.tzutcoff	= moment().format().slice(19);	

		setTZ(newtz);

	}, [objref]);	

	const memoTZ = useMemo(() => {
		return (
			<>
			<span>Timezone </span>
			<TimezonePicker defaultTZ={tz} onChange={onTZChange} />
			</>
		);	
	}, [tz, onTZChange]);	

	useEffect(() => {
		let		timer1 = 0;

		if (tz.length && datetimestrs[0].length && datetimestrs[1].length && datetimetzobjs[0] && datetimetzobjs[0].isValid() && datetimetzobjs[1] && datetimetzobjs[1].isValid()) {
			if (typeof onChange === 'function') {
				onChange(datetimetzobjs, datetimestrs);
			}	

			if (typeof autoResetSeconds === 'number' && autoResetSeconds > 0) {
				timer1 = setTimeout(() => {
					onDatesChange([null, null], ['', '']);
				}, autoResetSeconds * 1000);
			}	
		}
		else if (!datetimetzobjs[0] && !datetimetzobjs[1] && cbonreset && typeof onChange === 'function') {
			onChange(datetimetzobjs, datetimestrs);
		}	

		return () => { 
			if (timer1) clearTimeout(timer1);
		}

	}, [tz, datetimestrs, datetimetzobjs, onChange, autoResetSeconds, onDatesChange, cbonreset]);

	return (
		<RangePicker {...props} format="YYYY-MM-DD HH:mm:ss" showTime placeholder={placeholder ?? ["Select Start Date Time", "Select End Date Time"]}
			value={datetimestrs[0].length && datetimetzobjs[0] ? datetimetzobjs : undefined} onChange={onDatesChange} 
			disabledDate={disabledDate ?? (disableFuture ? disableFutureTimes : undefined)} renderExtraFooter={() => memoTZ} />
	);
}	

export const presetPointTime = [
	{ desc : 'Current Time', 	timeoffsetsec : '0' },	
	{ desc : '1 min ago', 		timeoffsetsec : '60' },	
	{ desc : '5 mins ago', 		timeoffsetsec : '300' },	
	{ desc : '15 mins ago',		timeoffsetsec : '900' },	
	{ desc : '1 hour ago', 		timeoffsetsec : '3600' },	
	{ desc : '12 hours ago', 	timeoffsetsec : '43200' },	
	{ desc : '24 hours ago', 	timeoffsetsec : '86400' },	
];

export const presetTimeRange = [
	{ desc : 'Last 1 min', 		timeoffsetsec : '60' },	
	{ desc : 'Last 5 mins', 	timeoffsetsec : '300' },	
	{ desc : 'Last 15 mins',	timeoffsetsec : '900' },	
	{ desc : 'Last 30 mins',	timeoffsetsec : '1800' },	
	{ desc : 'Last 1 hour', 	timeoffsetsec : '3600' },	
	{ desc : 'Last 3 hours', 	timeoffsetsec : '10800' },	
	{ desc : 'Last 6 hours', 	timeoffsetsec : '21600' },	
	{ desc : 'Last 12 hours', 	timeoffsetsec : '43200' },	
	{ desc : 'Last 24 hours', 	timeoffsetsec : '86400' },	
];

export function PresetTimesOrRanges({secOffsetCB, isrange = true, placeholder, presetArray})
{
	if (!secOffsetCB) {
		return null;
	}
	
	const		opts = [];

	if (!isrange) {
		const			prearr = presetArray ?? presetPointTime;

		for (let i = 0; i < prearr.length; ++i) {
			opts.push(<Option key={prearr[i].timeoffsetsec} value={prearr[i].timeoffsetsec}>{prearr[i].desc}</Option>);
		}	

		return (
			<Select style={{ width: 200 }} placeholder={placeholder ?? "Preset Times"} onChange={secOffsetCB} allowClear={true}>
			{opts}
			</Select>
		);
	}
	else {
		const			prearr = presetArray ?? presetTimeRange;

		for (let i = 0; i < prearr.length; ++i) {
			opts.push(<Option key={prearr[i].timeoffsetsec} value={prearr[i].timeoffsetsec}>{prearr[i].desc}</Option>);
		}	

		return (
			<Select style={{ width: 200 }} placeholder={placeholder ?? "Preset Time Ranges"} onChange={secOffsetCB} allowClear={true}>
			{opts}
			</Select>
		);
	}	
}	

export function TimeRangeButton({onChange, linktext, buttontype, title = "Select Time Range", placeholder, ...props})
{
	const onPresetRangeChange = useCallback((value) => {
		const		now = moment();
		const		mom = moment().subtract(Number(value), 'seconds');

		onChange([mom, now]);
	}, [onChange]);	


	return (
		<ButtonModal buttontext={linktext ?? "Select Time Range"} okText="Cancel" buttontype={buttontype}
			title={typeof title === 'string' ? <Title level={4}><em>{title}</em></Title> : title} maskClosable={false} width={800}
			contentCB={(modal) => (
				<Space>
				
				<PresetTimesOrRanges isrange={true} secOffsetCB={onPresetRangeChange} />
				<span> OR </span>
				<RangeTimeZonePicker onChange={onChange} placeholder={placeholder} {...props} />

				</Space>
					
				)} 
		/>	
	);
}	


export function TimeRangeAggrModal({onChange, showTime = true, showRange = true, minAggrRangeMin, maxAggrRangeMin, defaultaggrtype = "avg", alwaysShowAggrType, title = "Historical Data", showPresetTimes = true, disableFuture = true, buttonType = "default",  ...props})
{
	const		objref = useRef(null);
	const		[isTimeRange, setShowTimeRange]	= useState(showRange || !showTime ? 'range' : 'time');

	const		[{timeObj, timeString}, setPointTime] = useState({timeObj : null, timeString : null});
	const		[{rangeObjs, rangeStrings}, setRange] = useState({rangeObjs : null, rangeStrings : null});

	const		[maxAggr, setMaxAggr]	= useState(0);
	const		[useAggr, setUseAggr] = useState(true);
	const		[singleAggr, setSingleAggr] = useState(false);
	const		[aggrMin, setAggrMin] = useState(5);
	const		[aggrType, setAggrType] = useState(defaultaggrtype ?? 'avg');

	if (objref.current === null) {
		objref.current = {
			modal	:	null,
			aggrMin	:	aggrMin,
		}	
	}

	const validProps = () => {	

		if (typeof onChange !== 'function') {
			throw new Error(`TimeRangeAggrSelect : onChange prop not valid`);
		}

		if (!showTime && !showRange) {
			throw new Error(`TimeRangeAggrSelect : Both showTime and showRange props are false`);
		}	

		if (minAggrRangeMin && typeof minAggrRangeMin !== 'number') {
			throw new Error(`TimeRangeAggrSelect : Invalid minAggrRangeMin prop specified`);
		}	

		if (minAggrRangeMin && maxAggrRangeMin && typeof maxAggrRangeMin !== 'number') {
			throw new Error(`TimeRangeAggrSelect : Invalid maxAggrRangeMin prop specified`);
		}	

		return true;
	};	

	if (validProps() === false) {
		throw new Error(`Internal Error : TimeRangeAggrSelect validProps check failed`);
	}	

	const onTypeChange = useCallback((e) => {
		setShowTimeRange(e.target.value);
	}, []);

	const onTimeChange = useCallback((dateObj, dateString) => {
		setPointTime({timeObj : dateObj, timeString : dateString});
	}, []);	

	const onRangeChange = useCallback((dateObjs, dateStrings) => {
		if (!dateObjs || !dateStrings) {
			setRange({rangeObjs : dateObjs, rangeStrings : dateStrings});
			return;
		}

		const		rangesec = dateObjs[1].unix() - dateObjs[0].unix();
		let		maxagr = (rangesec + 600)/60;

		if (minAggrRangeMin > 0 && minAggrRangeMin <= rangesec/60) {

			if (maxAggrRangeMin > 0 && maxagr > maxAggrRangeMin) {
				maxagr = maxAggrRangeMin;
			}	
			setMaxAggr(maxagr);

			if (rangesec/60 >= minAggrRangeMin * 2 && rangesec/60 >= 5) {
				// Enable Aggregation by default
				setUseAggr(true);
			}	
			else {
				setUseAggr(false);
			}	

			if (maxagr < objref.current.aggrMin) {
				objref.current.aggrMin = maxagr;
				setAggrMin(maxagr);
			}	
		}
		else {
			setUseAggr(false);
			setMaxAggr(0);
		}	
		setRange({rangeObjs : dateObjs, rangeStrings : dateStrings});
	}, [objref, maxAggrRangeMin, minAggrRangeMin]);	

	const onCancel = useCallback(() => {
		if (isTimeRange === 'time') {
			onTimeChange(null, null);
		}
		else {
			onRangeChange(null, null);
		}	
	}, [isTimeRange, onTimeChange, onRangeChange]);	

	const onModalOk = useCallback(() => {
		if (isTimeRange === 'time') {
			if (safetypeof(timeObj) === 'object' && safetypeof(timeString) === 'string') {
				onChange(timeObj, timeString);
				onCancel();
			}
			else {
				message.error(`Please select a proper timestamp or press Cancel...`);
			}	
		}
		else {
			if (safetypeof(rangeObjs) === 'array' && rangeObjs.length && safetypeof(rangeStrings) === 'array' && 
				(!useAggr || (aggrMin && aggrMin <= maxAggr && aggrType) || (singleAggr && aggrType))) {
				
				onChange(rangeObjs, rangeStrings, useAggr, singleAggr ? maxAggr : aggrMin, aggrType);
				onCancel();
			}	
			else {
				message.error(`Please select a proper time range or press Cancel...`);
			}	
		}
	}, [onChange, onCancel, isTimeRange, timeObj, timeString, rangeObjs, rangeStrings, maxAggr, useAggr, singleAggr, aggrMin, aggrType]);	


	const onAggrTypeChange = useCallback((value) => {
		setAggrType(value);
	}, []);	

	const onPresetTimeChange = useCallback((value) => {
		const		mom = moment().subtract(Number(value), 'seconds');

		onTimeChange(mom, mom.format());
	}, [onTimeChange]);	

	const onPresetRangeChange = useCallback((value) => {
		const		now = moment();
		const		mom = moment().subtract(Number(value), 'seconds');

		onRangeChange([mom, now], [mom.format(), now.format()]);
	}, [onRangeChange]);	

	const preset = useMemo(() => {
		if (!showPresetTimes) {
			return null;
		}
		
		const		opts = [];

		if (isTimeRange === 'time') {
			for (let i = 0; i < presetPointTime.length; ++i) {
				opts.push(<Option key={presetPointTime[i].timeoffsetsec} value={presetPointTime[i].timeoffsetsec}>{presetPointTime[i].desc}</Option>);
			}	

			return (
				<Select style={{ width: 200 }} placeholder="Preset Times" onChange={onPresetTimeChange} allowClear={true}>
				{opts}
				</Select>
			);
		}
		else {
			for (let i = 0; i < presetTimeRange.length; ++i) {
				opts.push(<Option key={presetTimeRange[i].timeoffsetsec} value={presetTimeRange[i].timeoffsetsec}>{presetTimeRange[i].desc}</Option>);
			}	

			return (
				<Select style={{ width: 200 }} placeholder="Preset Time Ranges" onChange={onPresetRangeChange} allowClear={true}>
				{opts}
				</Select>
			);
		}	
	}, [showPresetTimes, isTimeRange, onPresetTimeChange, onPresetRangeChange]);

	const typesel = useMemo(() => {
		if (!(showTime && showRange)) {
			return null;
		}	

		return (
			<Radio.Group onChange={onTypeChange} value={isTimeRange}>
				<Radio value={'range'}>Time Range</Radio>
				<Radio value={'time'}>Specific Point in Time</Radio>
			</Radio.Group>	
		);	
	}, [showTime, showRange, isTimeRange, onTypeChange]);


	const timecomp = useMemo(() => {
		if (isTimeRange === 'range') {
			return null;
		}	

		return (
			<>
			<div style={{ marginTop : 20, marginBottom : 20 }}>
			<Space>
			<span>Select Specific Time</span>
			{preset}
			<span>OR</span>
			<DateTimeZonePicker onChange={onTimeChange} disableFuture={disableFuture} {...props} />
			</Space>
			</div>
			</>
		);
	}, [isTimeRange, preset, props, disableFuture, onTimeChange]);	

	const rangecomp = useMemo(() => {
		if (isTimeRange === 'time') {
			return null;
		}	
		
		/*console.log(`rangecomp memo called : useAggr = ${useAggr} maxAggr = ${maxAggr} aggrMin = ${aggrMin}`);*/

		return (
			<>
			<div style={{ marginTop : 20, marginBottom : 20 }}>
			<Space>	
			<span>Select Time Range</span>
			{preset}
			<span>OR</span>
			<RangeTimeZonePicker onChange={onRangeChange} disableFuture={disableFuture} {...props} />
			</Space>
			{maxAggr > 0 && 
				<>
				<div style={{ marginTop : 20, marginBottom : 20, display : 'block' }}>
				<Space>	
				
				<>
				<Space>	
				<span><Text><i>Apply DB Aggregation</i></Text></span>
				<Switch checked={useAggr} onChange={(checked) => { setUseAggr(checked); }} />	
				</Space>
				</>

				{useAggr && 
				<>
				<Space style={{ marginLeft: 15 }}>	
				<span><Text><i>DB Aggregation with no Step Interval</i></Text></span>
				<Switch checked={singleAggr} onChange={(checked) => { setSingleAggr(checked); }} />	
				</Space>
				</>
				}


				</Space>
				</div>
				{useAggr && 
					<>
					<div style={{ marginTop : 20, marginBottom : 20, display : 'block' }}>
					<Space>	
					<span><Text><i>Aggregate Step Interval </i></Text></span>
					<InputNumber min={minAggrRangeMin} max={maxAggr} defaultValue={5} disabled={singleAggr}
						value={aggrMin ?? 5} onChange={(val) => {objref.current.aggrMin = val; setAggrMin(val);} } /> 
					<span><Text><i>minutes using </i></Text></span> 

					<Select style={{ width: 250 }} onChange={onAggrTypeChange} defaultValue={defaultaggrtype ?? 'avg'} >	
					<Option value='avg'>Average of Aggregation Interval</Option>
					<Option value='max'>Max of Aggregation Interval</Option>
					<Option value='min'>Min of Aggregation Interval</Option>
					<Option value='sum'>Sum of Aggregation Interval</Option>
					</Select>

					</Space>
					</div>
					</>
				}
				</>
			}
			{!maxAggr && alwaysShowAggrType && 
				<>
				<div style={{ marginTop : 20, marginBottom : 20 }}>
				<span><Text><i>Aggregate using </i></Text></span> 

				<Select style={{ width: 250 }} onChange={onAggrTypeChange} defaultValue={defaultaggrtype ?? 'avg'} >	
				<Option value='avg'>Average of Interval</Option>
				<Option value='max'>Max of Interval</Option>
				<Option value='min'>Min of Interval</Option>
				<Option value='sum'>Sum of Interval</Option>
				</Select>

				</div>
				</>
			}	

			</div>
			</>
		);
	}, [objref, isTimeRange, preset, onRangeChange, disableFuture, useAggr, singleAggr, minAggrRangeMin, maxAggr, aggrMin, onAggrTypeChange, defaultaggrtype, alwaysShowAggrType, props]);	

	const modalcontent = useMemo(() => {
		return (
		<>
		<div style={{ marginTop : 20, marginBottom : 20 }}>
			<Space direction='vertical'>	
			{typesel}
			{timecomp}
			{rangecomp}
			</Space>
		</div>
		</>
		);
	}, [typesel, timecomp, rangecomp]);

	const modonclick = () => {
		objref.current.modal = Modal.confirm({
			title : title,

			content : modalcontent,
			width : 1200,	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,

			onOk : onModalOk,
			onCancel : onCancel,
		});
	};	

	if (objref.current && objref.current.modal) {
		objref.current.modal.update({
			title : title,

			content : modalcontent,
			width : 1200,	
			closable : true,
			destroyOnClose : true,
			maskClosable : true,

			onOk : onModalOk,
			onCancel : onCancel,
		});
	}	
	
	return <Button type={buttonType} onClick={modonclick} >{title}</Button>;

}

