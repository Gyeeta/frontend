
import React, { useState, useCallback, useMemo, useRef, useReducer, forwardRef, useImperativeHandle }  from 'react';

import moment from 'moment';
import { format } from "d3-format";

import { Collection, TimeSeries, TimeEvent, TimeRange } from 'pondjs';
import { ChartContainer, ChartRow, Charts, YAxis, LineChart, ScatterChart, Resizable, Legend, Baseline, styler } from '../thirdparty/react-timeseries-charts/entry.js';

import {Button, Space} from 'antd';

import {useDebouncedEffect, useDidMountEffect, arrayShiftLeft, fixedArrayAddItems, getStateColor} from './util.js';

// 35 color list for dark backgrounds
export const chartColorList = [
	"pink", "orange", "white", "yellow", "green", "Coral", "cyan", "blue", "red",  
	"steelblue", "BlueViolet", "BurlyWood", "DarkOliveGreen", "DarkSalmon", "DarkSeaGreen", "DarkSlateGrey", "GoldenRod", "IndianRed", "LightSalmon", 
	"NavajoWhite", "Olive", "OliveDrab", "PeachPuff", "Peru", "Plum", "RosyBrown", "Salmon", "Tan", "Tomato",
	"Wheat", "YellowGreen", "Thistle", "DarkKhaki", "DarkCyan",
];

export class ColumnInfo
{
	constructor(col, desc, color, yaxis = 1, fmt = ",.2f", isextra = false, enableLegend = true, isnumber = true, trackerStyleCB = null)
	{
		this.col		= col;
		this.desc		= desc;
		this.color		= color;
		this.yaxis		= yaxis;
		this.fmt		= fmt;
		this.isextra		= isextra;
		this.enableLegend	= enableLegend;
		this.isnumber		= isnumber;
		this.trackerStyleCB	= trackerStyleCB;

		if (trackerStyleCB && typeof trackerStyleCB !== 'function') {
			throw new Error("Invalid type for trackerStyleCB for Chart tracker");
		}	
	}	
};	

export function getTimeEvent(item, columnInfoArr, isY1series = true, timefield = 'time')
{
	let		obj = {};

	if (isY1series) {
		for (let i = 0; i < columnInfoArr.length; ++i) {
			if (columnInfoArr[i].yaxis === 1) {
				if (columnInfoArr[i].isnumber) {
					if (item[columnInfoArr[i].col] !== undefined) {
						obj[columnInfoArr[i].col] = Number(item[columnInfoArr[i].col]);
					}
					else {
						obj[columnInfoArr[i].col] = 0;
					}	
				}
				else {
					if (item[columnInfoArr[i].col] !== undefined) {
						obj[columnInfoArr[i].col] = item[columnInfoArr[i].col];
					}
					else {
						obj[columnInfoArr[i].col] = '';
					}	
				}	
			}	
			else {
				break;
			}	
		}	
	}
	else {
		for (let i = 1; i < columnInfoArr.length; ++i) {
			if (columnInfoArr[i].yaxis === 2) {
				if (columnInfoArr[i].isnumber) {
					if (item[columnInfoArr[i].col] !== undefined) {
						obj[columnInfoArr[i].col] = Number(item[columnInfoArr[i].col]);
					}
					else {
						obj[columnInfoArr[i].col] = 0;
					}	
				}
				else {
					if (item[columnInfoArr[i].col] !== undefined) {
						obj[columnInfoArr[i].col] = item[columnInfoArr[i].col];
					}
					else {
						obj[columnInfoArr[i].col] = '';
					}	
				}	
			}	
		}	
	}	

	const 		timestamp = moment(new Date(item[timefield]));

	return new TimeEvent(timestamp.toDate(), obj);
}	

function getCollectionSeries(collection, columnInfoArr, isY1series, sortdata)
{
	if (sortdata === true) {
		collection = collection.sortByTime();
	}	

	const name 	= isY1series ? "Y1_series" : "Y2_series";
	const columns 	= ["time"];
	
	if (isY1series) {
		for (let i = 0; i < columnInfoArr.length; ++i) {
			if (columnInfoArr[i].yaxis === 1) {
				if (columnInfoArr[i].isextra === false) {
					columns.push(columnInfoArr[i].col);
				}	
			}	
			else {
				break;
			}	
		}	
	}	
	else {
		for (let i = 1; i < columnInfoArr.length; ++i) {
			if (columnInfoArr[i].yaxis === 2) {
				if (columnInfoArr[i].isextra === false) {
					columns.push(columnInfoArr[i].col);
				}	
			}	
		}		
	}	

	return new TimeSeries({ name : name, columns : columns, collection: collection });
}	

export function getTimeSeries(data, columnInfoArr, isY1series = true, timefield = 'time', sortdata = true)
{
	if (Array.isArray(data) === false) {
		throw new Error("Invalid data format for Chart Timeseries");
	}	

	const eventseries = data.map(item => getTimeEvent(item, columnInfoArr, isY1series, timefield));

	let collection = new Collection(eventseries);

	return getCollectionSeries(collection, columnInfoArr, isY1series, sortdata);
}	

// Returns new TimeSeries after adding item to fixedarray
export function fixedSeriesAddItems(itemarray, fixedarray, fixedsize, columnInfoArr, isY1series = true, sortdata = false)
{
	fixedArrayAddItems(itemarray, fixedarray, fixedsize);

	let collection = new Collection(fixedarray);
	
	return getCollectionSeries(collection, columnInfoArr, isY1series, sortdata);
}	

export function getFixedInitArray(initdata, fixedsize, columnInfoArr, isY1series = true, timefield = 'time', sortdata = true)
{
	if (Array.isArray(initdata) === false) {
		throw new Error("Invalid init data format for Chart fixed series");
	}	

	const eventseries = initdata.map(item => getTimeEvent(item, columnInfoArr, isY1series, timefield));

	const collection = new Collection(eventseries);

	let		sortedseries;

	if (sortdata === true) {
		sortedseries = collection.sortByTime();
	}
	else {
		sortedseries = collection;
	}	

	const		array = sortedseries.eventListAsArray();

	arrayShiftLeft(array, array.length > fixedsize ? array.length - fixedsize : 0);

	return array;
}	

export const darkAxisStyle = {
	label: {
		stroke: "none",
		fill: "#AAA",
		fontWeight: 200,
		fontSize: 14,
		font: '"Goudy Bookletter 1911", sans-serif"'
	},
	values: {
		stroke: "none",
		fill: "#888",
		fontWeight: 100,
		fontSize: 11,
		font: '"Goudy Bookletter 1911", sans-serif"'
	},
	ticks: {
		fill: "none",
		/*stroke: "#AAA",*/
		stroke: "none",
		opacity: 0.2
	},
	axis: {
		fill: "none",
		stroke: "#AAA",
		opacity: 1
	},
};

export const darkChartStyle = {
	background: "#201d1e",
	borderRadius: 8,
	borderStyle: "solid",
	borderWidth: 1,
	borderColor: "#232122"
};

export const baselineStyle = {
	label : { 
		fill: "#8B7E7E", 
		fontWeight: 100, 
		fontSize: 11, 
		pointerEvents: "none" 
	}, 
	line : { 
		stroke: "#626262", 
		strokeWidth: 1, 
		strokeDasharray: "5,3", 
		pointerEvents: "none" 
	},
};	

export function isY2Axis(columnInfoArr)
{
	return columnInfoArr[columnInfoArr.length - 1].yaxis === 2;
}	

export function getLineChartStyler(columnInfoArr)
{
	let		arr = [];

	for (let i = 0; i < columnInfoArr.length; ++i) {
		arr[i] = { 
			key 	: columnInfoArr[i].col,
			color 	: columnInfoArr[i].color,
			width 	: 1,
		};	
	}	

	return styler(arr);
}	

export function getLegendStyle(columnInfoArr)
{
	let		obj = {};

	for (let i = 0; i < columnInfoArr.length; ++i) {
		if (!columnInfoArr[i].enableLegend) continue;

		const 		col = columnInfoArr[i].col, color = columnInfoArr[i].color;
		
		obj[col] = {
			symbol: {
				normal: { stroke: color, fill: "none", strokeWidth: 1, paddingRight: 10, cursor: "pointer", },
				highlighted: { stroke: color, fill: "none", strokeWidth: 1, paddingRight: 10, cursor: "pointer", },
				selected: { stroke: color, fill: "none", strokeWidth: 2, paddingRight: 10, cursor: "pointer", },
				muted: { stroke: color, fill: "none", opacity: 0.4, strokeWidth: 1, paddingRight: 10, cursor: "pointer", }
			},
			label: {
				normal: { fontSize: "normal", color: color, paddingRight: 10, cursor: "pointer", },
				highlighted: { fontSize: "normal", color: color, paddingRight: 10, cursor: "pointer", },
				selected: { fontSize: "normal", color: color, paddingRight: 10, cursor: "pointer", },
				muted: { fontSize: "normal", color: color, opacity: 0.4, paddingRight: 10, cursor: "pointer", }
			},
			value: {
				normal: { fontSize: "normal", color: color, paddingRight: 10, cursor: "pointer", },
				highlighted: { fontSize: "normal", color: color, paddingRight: 10, cursor: "pointer", },
				selected: { fontSize: "normal", color: color, paddingRight: 10, cursor: "pointer", },
				muted: { fontSize: "normal", color: color, opacity: 0.4, paddingRight: 10, cursor: "pointer", }
			}
		}	
	}	
	
	return obj;
}	

export function getLegendCategories(columnInfoArr, activeStateObj)
{
	if (columnInfoArr.length === 1) {
		return [];
	}

	let		arr = [], idx = 0;

	for (let i = 0; i < columnInfoArr.length; ++i) {
		if (columnInfoArr[i].enableLegend) {
			const		col = columnInfoArr[i].col;
	
			arr[idx] = {
				key		: col,
				label		: columnInfoArr[i].desc,
				disabled	: !activeStateObj[col],
				intidx		: i,		
			}	

			idx++;
		}
	}	
	
	return arr;
}	

export function stateColorStyle(column, event, statecolumn, opacity = 1.0)
{
	const state = event.get(statecolumn);
	const color = getStateColor(state);

	return {
		normal: {
			fill: color,
			opacity: opacity,
		},
		highlighted: {
			fill: color,
			stroke: "none",
			opacity: opacity,
		},
		selected: {
			fill: "none",
			stroke: "#2CB1CF",
			strokeWidth: 3,
			opacity: opacity,
		},
		muted: {
			stroke: "none",
			opacity: opacity/2,
			fill: color
		}
	};
};

export function stateScatterRadius(event, column, statecolumn, onlyBad = false)
{
	const state = event.get(statecolumn);

	if (state === 'Severe') return 4;

	if (onlyBad) {
		// Show only Bad/Severe

		if (state === 'Bad') return 3;
		return 0;
	}	

	return 3;
}

export function getBaselineObj(label, value, yaxis = 1, position = "left")
{
	return {
		label,
		value,
		yaxis,
		position,
	};	
}	

export function getScatterObj(column, yaxis, stylecb, radiuscb, fmt = ".0f", eventShape = "circle", piggybackCol = null)
{
	if ((typeof stylecb !== 'function') || (typeof radiuscb !== 'function')) {
		throw new Error(`Invalid style or radius type specified for Scatter chart`);
	}

	return {
		column,
		yaxis,
		stylecb,
		radiuscb,
		fmt,
		eventShape,
		piggybackCol
	};	
}	


// Currently does not handle multi row charts and more than 2 Y axis
export const GyLineChart = forwardRef(({chartTitle, columnInfoArr, seriesy1, seriesy2, enableTracker = true, enablePanZoom, chartHeight = 300, 
				y1AxisType = 'linear', y2AxisType = 'linear', baselineArray, scatterArray,
				y1AxisTitle, y2AxisTitle, y1AxisFormat = ",.0f", y2AxisFormat = ",.0f", onRescaleComps, timeRangeCB, utc, ...props}, ref) => 
{
	const		objref = useRef(null);

	const 		[active, setActive] = useState(() => {
				const		astate = {};

				for (let i = 0; i < columnInfoArr.length; ++i) {
					if (columnInfoArr[i].enableLegend) {
						astate[columnInfoArr[i].col] = true;
					}
				}	

				return astate;
			});


	const		[isRescale, setIsRescale] = useState(false);
	const		[tracker, setTracker] = useState(null);
	const 		[, forceUpdate] = useReducer(x => x + 1, 0);


	if (objref.current === null) {
		// We consider the max only of the first column for each axis
		
		let firstY2col = null;

		if (seriesy2) {
			for (let i = 1; i < columnInfoArr.length; ++i) {
				if (columnInfoArr[i].yaxis === 2) {
					firstY2col = columnInfoArr[i].col;
					break;
				}	
			}	
		}
		
		const		timerange = seriesy1.range();

		objref.current = {
			timerange : timerange,
			origtimerange : timerange,
			firstY2col : firstY2col,
			maxy1 : seriesy1.max(columnInfoArr[0].col),
			maxy2 : (firstY2col ? seriesy2.max(firstY2col) : 0),
		};	
	}	

	useDidMountEffect(() => {
		const 		start = seriesy1.begin().getTime(), end = seriesy1.end().getTime();
		const 		origstart = objref.current.origtimerange.begin().getTime(), origend = objref.current.origtimerange.end().getTime();

		if (start === origstart && end === origend) {
			return;
		}	
		
		const r = new TimeRange(start, end);

		objref.current.origtimerange = r;
		objref.current.timerange = r;
		
	}, [seriesy1, seriesy2, objref]);	


	const rescaleAxis = useCallback((newtimerange) => {
		try {
			const 		start = newtimerange.begin().getTime(), end = newtimerange.end().getTime();
			let		newmaxy1 = -Infinity, newmaxy2 = -Infinity;

			for (let i = 0; i < seriesy1.size(); ++i) {
				let		e = seriesy1.at(i);
				let		t = e.timestamp().getTime();

				if (e && t >= start && t <= end) {	
					let		val = e.get(columnInfoArr[0].col);

					if (val > newmaxy1) {
						newmaxy1 = val;
					}	
				}
				else if (t > end) {
					break;
				}	
			}

			if (objref.current.firstY2col) {
				for (let i = 0; i < seriesy2.size(); ++i) {
					let		e = seriesy2.at(i);
					let		t = e.timestamp().getTime();

					if (e && t >= start && t <= end) {	
						let		val = e.get(objref.current.firstY2col);

						if (val > newmaxy2) {
							newmaxy2 = val;
						}	
					}
					else if (t > end) {
						break;
					}	
				}
			}

			objref.current.maxy1 = newmaxy1;
			objref.current.maxy2 = newmaxy2;
		}
		catch(e) {
			console.log(`Exception seen while rescaling data : ${e.message}`);
		}	
	}, [seriesy1, seriesy2, columnInfoArr, objref]);	

	useDebouncedEffect(() => {
		rescaleAxis(objref.current.timerange);
	}, 300, [objref, rescaleAxis]);	

	const 	handleTimeRangeChange = useCallback((newtimerange) => {
		const 		origstart = objref.current.origtimerange.begin().getTime(), origend = objref.current.origtimerange.end().getTime();
		const 		start = newtimerange.begin().getTime(), end = newtimerange.end().getTime();
		let		isnewrescale = true;

		/*console.log(`Timerange Change : start = ${start} end = ${end} origstart = ${origstart} origend = ${origend}`);*/

		if (start <= origstart && end >= origend) {
			isnewrescale = false;
		}

		objref.current.timerange = newtimerange;

		setIsRescale(isnewrescale);

		if (enableTracker) {
			setTracker(newtimerange.end());
		}	
	}, [objref, enableTracker]);

	const getTrackerInfoValues = useCallback(() => {
		let		valarr = [];
		let		i1, i2, e1, e2, i = 0;

		if (tracker) {
			i1 = seriesy1.bisect(new Date(tracker));
			e1 = seriesy1.at(i1);

			if (seriesy2) {
				i2 = seriesy2.bisect(new Date(tracker));
				e2 = seriesy2.at(i2);
			}

			if (e1) {
				for (; i < columnInfoArr.length && columnInfoArr[i].yaxis === 1; ++i) {
					let		val;

					if (columnInfoArr[i].isnumber) {
						val = format(columnInfoArr[i].fmt)(e1.get(columnInfoArr[i].col));
					}	
					else {
						val = e1.get(columnInfoArr[i].col);
					}	

					const valueStyle = columnInfoArr[i].trackerStyleCB ? columnInfoArr[i].trackerStyleCB(e1, val) : undefined;

					valarr.push({ label : columnInfoArr[i].desc, value : val, valueStyle });
				}
			}

			if (e2) {
				for (; i < columnInfoArr.length; ++i) {
					if (columnInfoArr[i].yaxis === 2) {
						let		val;

						if (columnInfoArr[i].isnumber) {
							val = format(columnInfoArr[i].fmt)(e2.get(columnInfoArr[i].col));
						}	
						else {
							val = e2.get(columnInfoArr[i].col);
						}	

						const valueStyle = columnInfoArr[i].trackerStyleCB ? columnInfoArr[i].trackerStyleCB(e2, val) : undefined;

						valarr.push({ label : columnInfoArr[i].desc, value : val, valueStyle });
					}
				}
			}	
		}

		return valarr;

	}, [tracker, seriesy1, seriesy2, columnInfoArr]);	

	const trackerInfoValues = useMemo(() => {
		if (enableTracker) {
			return getTrackerInfoValues();
		}

		return [];
	}, [enableTracker, getTrackerInfoValues]);	

	const handleActiveChange = useCallback((key) => {
		setActive(prevActive => {
			const		astate = {};

			astate[key] 	= !prevActive[key];

			return {...prevActive, ...astate};
		});	

	}, [setActive]);
	
	const onTimeRangeChanged = useCallback((newtimerange) => {
		if (typeof timeRangeCB === 'function') {
			timeRangeCB(chartTitle, newtimerange);
		}

		handleTimeRangeChange(newtimerange);

	}, [chartTitle, timeRangeCB, handleTimeRangeChange]);

	const onResetZoom = useCallback(() => {

		if (typeof timeRangeCB === 'function') {
			timeRangeCB(chartTitle, objref.current.origtimerange);
		}

		handleTimeRangeChange(objref.current.origtimerange);

	}, [chartTitle, timeRangeCB, handleTimeRangeChange]);	

	const handleTrackerChanged = useCallback((t) => {
		setTracker(t);
	}, [setTracker]);

	useImperativeHandle(ref, () => ({
		getRescaleTimerange : () => {
			const 		start = objref.current.timerange.begin().getTime(), end = objref.current.timerange.end().getTime();

			return [start, end];
		},

		getDataPoint : (datepoint) => {
			let		obj = {};
			let		i1, i2, e1, e2, i = 0;

			if (datepoint) {
				i1 = seriesy1.bisect(new Date(datepoint));
				e1 = seriesy1.at(i1);

				if (seriesy2) {
					i2 = seriesy2.bisect(new Date(datepoint));
					e2 = seriesy2.at(i2);
				}

				if (e1) {
					for (; i < columnInfoArr.length && columnInfoArr[i].yaxis === 1; ++i) {
						obj[columnInfoArr[i].col] = e1.get(columnInfoArr[i].col);
					}
				}

				if (e2) {
					for (; i < columnInfoArr.length; ++i) {
						if (columnInfoArr[i].yaxis === 2) {
							obj[columnInfoArr[i].col] = e2.get(columnInfoArr[i].col);
						}
					}
				}	
			}

			return obj;
		},	

		setNewTimeRange : (newtimerange) => {
			handleTimeRangeChange(newtimerange);
		},	

		setNewTimeTracker : (newdate) => {
			handleTrackerChanged(newdate);
		},	

		setForceUpdate : () => {
			forceUpdate();
		},	

		setResetZoom : () => {
			onResetZoom();
		},	
	}), [objref, seriesy1, seriesy2, columnInfoArr, handleTimeRangeChange, handleTrackerChanged, onResetZoom]);

	const legendstyle = useMemo(() => {

		return getLegendStyle(columnInfoArr);

	}, [columnInfoArr]);

	const legend = useMemo(() => {

		const lobj = getLegendCategories(columnInfoArr, active);

		if (lobj.length && scatterArray) {
			// We need to overwrite the label to include the svg

			for (let i = 0; i < scatterArray.length; i++) {
				const item = scatterArray[i];

				for (let j = 0; j < lobj.length; ++j) {
					if (item.column === lobj[j].key) {
						if (item.eventShape === "rect") {
							lobj[j].label = (<><svg width={8} height={8}><rect width={7} height={7} style={{ fill: columnInfoArr[lobj[j].intidx].color }} />
									</svg><span> {columnInfoArr[lobj[j].intidx].desc}</span></>);
						}	
						else {
							lobj[j].label = (<><svg width={10} height={10}><circle cx={5} cy={5} r={4} style={{ fill: columnInfoArr[lobj[j].intidx].color }} />
									</svg><span> {columnInfoArr[lobj[j].intidx].desc}</span></>);
						}

						break;
					}	
				}	
			}
		}	

		return lobj;

	}, [columnInfoArr, active, scatterArray]);	

	const chartstyle = useMemo(() => {

		return getLineChartStyler(columnInfoArr);

	}, [columnInfoArr]);	

	// Returns array of active column array
	const activeColArr = useMemo(() => {
		let		arr = [[], []], i = 0;

		for (; i < columnInfoArr.length && columnInfoArr[i].yaxis === 1; ++i) {
			if (!columnInfoArr[i].isextra) {
				if (!columnInfoArr[i].enableLegend || active[columnInfoArr[i].col]) {
					arr[0].push(columnInfoArr[i].col);
				}
			}
		}

		for (; i < columnInfoArr.length; ++i) {
			if (!columnInfoArr[i].isextra && (columnInfoArr[i].yaxis === 2)) {
				if (!columnInfoArr[i].enableLegend || active[columnInfoArr[i].col]) {
					arr[1].push(columnInfoArr[i].col);
				}
			}
		}

		return arr;

	}, [columnInfoArr, active]);	


	const chartarr = useMemo(() => {
		let		carr = [];

		if (activeColArr[0].length) {
			carr.push(<LineChart
					key="y1main"
					axis="axis1"
					series={seriesy1}
					columns={activeColArr[0]}
					style={chartstyle}
					interpolation="curveMonotoneX"
				/>
			);	

		}	

		if (activeColArr[1].length) {
			carr.push(<LineChart
					key="y2main"
					axis="axis2"
					series={seriesy2}
					columns={activeColArr[1]}
					style={chartstyle}
					interpolation="curveMonotoneX"
				/>
			);	
		}
		
		if (baselineArray) {
			for (let i = 0; i < baselineArray.length; i++) {
				const item = baselineArray[i];

				carr.push( <Baseline key={item.label} axis={item.yaxis === 2 ? "axis2" : "axis1"} 
						style={baselineStyle} value={item.value} label={item.label} position={item.position ?? "left"} />);
			}			
		}

		if (scatterArray) {
			for (let i = 0; i < scatterArray.length; i++) {
				const item = scatterArray[i];

				if (active[item.column] === undefined || active[item.column] === true) {
					carr.push(				
						<ScatterChart
							key={`scatter$i`}
							axis={item.yaxis === 2 ? "axis2" : "axis1"}
							series={item.yaxis === 2 ? seriesy2 : seriesy1}
							columns={[item.piggybackCol ?? item.column]} 
							style={item.stylecb}
							eventShape={item.eventShape}
							format={item.fmt || ".0f"}
							radius={item.radiuscb}
						/>
					);
				}
			}			
		}

		return carr;

	}, [activeColArr, active, chartstyle, seriesy1, seriesy2, baselineArray, scatterArray]);	

	const getRescaleComps = useMemo(() => {

		return onRescaleComps && onRescaleComps(chartTitle, isRescale);

	}, [onRescaleComps, chartTitle, isRescale]);	

	let rescaleComp;

	if (isRescale) {
		rescaleComp = (	<>
				<Space>
				{getRescaleComps}
				<Button onClick={(e) => onResetZoom()}>Reset Zoom</Button>
				</Space>
				</>);
	}	
	else {
		rescaleComp = null;
	}	

	const charts = (
		<ChartContainer
				title={chartTitle}
				style={darkChartStyle}
				timeAxisStyle={darkAxisStyle}
				titleStyle={{
					color: "#EEE",
					fontWeight: 500
				}}
				padding={20}
				paddingTop={5}
				paddingBottom={0}
				enableDragZoom={true}
				enablePanZoom={enablePanZoom ?? isRescale}
				onTimeRangeChanged={onTimeRangeChanged}
				onTrackerChanged={enableTracker ? handleTrackerChanged : undefined}
				trackerPosition={enableTracker ? tracker : undefined}
				timeRange={objref.current.timerange}
				utc={utc}
				maxTime={objref.current.origtimerange.end()}
				minTime={objref.current.origtimerange.begin()}
			>
			<ChartRow 
				height={chartHeight}
				trackerInfoValues={enableTracker ? trackerInfoValues : undefined}			
				trackerInfoHeight={enableTracker ? 20 + trackerInfoValues.length * 16 : undefined}
				trackerInfoWidth={enableTracker ? 300 : undefined}
			>
				<YAxis
					id="axis1"
					label={y1AxisTitle ?? columnInfoArr[0].desc}
					showGrid
					hideAxisLine
					transition={300}
					style={darkAxisStyle}
					labelOffset={-10}
					min={0}
					max={objref.current.maxy1}
					format={y1AxisFormat}
					width="60"
					type={y1AxisType}
				/>
				<Charts>
					{chartarr}
						
				</Charts>
				<YAxis
					id="axis2"
					label={y2AxisTitle ?? seriesy2 ? columnInfoArr[columnInfoArr.length - 1].desc : ''}
					showGrid
					hideAxisLine
					transition={300}
					style={darkAxisStyle}
					labelOffset={10}
					min={0}
					max={objref.current.maxy2}
					format={y2AxisFormat}
					width="80"
					type={y2AxisType}
				/>
			</ChartRow>
		</ChartContainer>
	);

	/*console.log(`Rendering the chart...`);*/

	return (
		<>
		<div style={{ backgroundColor : '#201d1e', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom : '1px dotted #d9d9d9', borderRadius: 5 }}>
		
		<div style={{ marginTop: 10, marginLeft: 10 }}>
		{columnInfoArr.length > 1 && 
		<Legend
			type="line"
			symbolWidth={8}
			symbolHeight={8}
			align="left"
			style={legendstyle}
			categories={legend}
			onSelectionChange={handleActiveChange}
		/>
		}
		</div>
		<div style={{ padding: 10 }}>
			{rescaleComp}
		</div>
		
		</div>

		<div>
			<Resizable>
				{charts}
			</Resizable>
		</div>
		</>
	);
});


