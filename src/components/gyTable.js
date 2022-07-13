
import 	React from 'react';
import 	{ Table, Input, InputNumber, Button, Space, Radio } from 'antd';
import 	{ SearchOutlined } from '@ant-design/icons';
import	{merge as LodashMerge} from 'lodash';
import 	Highlighter from 'react-highlight-words';

import 	{safetypeof} from './util.js';

import 	moment from 'moment';

export function getTableScroll(scrollX = 1300, scrollY = 700)
{
	return {
		x 	:	window.innerWidth < scrollX ? window.innerWidth - 50 : scrollX,
		y 	:	window.innerHeight < scrollY ? window.innerWidth - 50 : scrollY,
	};	
}

export function getFixedColumns(colarr)
{
	if (safetypeof(colarr) !== 'array') {
		return colarr;
	}	

	const			oarr = [];

	for (let col of colarr) {
		if (col.fixed === 'left') {
			oarr.push(col);
		}	
	}	

	for (let col of colarr) {
		if (!col.fixed) {
			oarr.push(col);
		}	
	}	

	for (let col of colarr) {
		if (col.fixed === 'right') {
			oarr.push(col);
		}	
	}	

	return oarr;
}	
	
export function addDefaultSort(colarr, defaultSortKey, sorter, sortOrder = 'ascend')
{
	if (!colarr || !defaultSortKey || !sorter || !Array.isArray(colarr)) {
		return colarr;
	}	
	
	const		newarr = [...colarr];

	for (let i = 0; i < newarr.length; ++i) {
		newarr[i].defaultSortOrder = undefined;

		if (newarr[i].key === defaultSortKey) {
			newarr[i].sorter 		= sorter;
			newarr[i].defaultSortOrder 	= sortOrder;
			break;
		}	
	}	

	return newarr;
}	

function pageShowTotal(total, range)
{
	return `${range[0]}-${range[1]} of ${total}`; 
}	

function itemRender(current, type, originalElement) 
{
	if (type === 'prev') {
		return <Button type="link">Previous</Button>;
	}
	if (type === 'next') {
		return <Button type="link">Next</Button>;
	}
	return originalElement;
}

export class GyTable extends React.Component 
{
  constructor(props) {
	super(props);

	if (typeof props.gyprefilter?.searchedColumn != 'string') {
		this.state = {
			searchText 	: '',
			radioopt 	: 0,
			searchedColumn 	: '',
		};
		this.regexp		= null;
	}	
	else {
		const		txt = props.gyprefilter.searchText || '';

		this.state = {
			searchText 	: txt,
			radioopt	: props.gyprefilter.radioopt || 0,
			searchedColumn	: props.gyprefilter.searchedColumn,
		};

		this.regexp		= txt.length ? new RegExp(txt, "i") : null;
	}	

	this.radioopt			= this.state.radioopt;
	this.searchTimeset 		= false;
	this.state.currPage		= 1;
	this.sorterField		= '';
	this.sorterOrder		= '';
	this.searchActive		= 0;
	this.modalCount			= typeof this.props.modalCount === 'function' ? this.props.modalCount : undefined;
  }
  
  addColumnProps = (dataIndex, title, gytype, propcol) => {

    const filRadioStyle = {
      display: 'block',
      height: '30px',
      lineHeight: '30px',
    };

    let outcol = {};

    if (!propcol.filterDropdown && !propcol.filterIcon && !propcol.onFilter) { 
	    outcol.filterDropdown = ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (

	     (this.tclearFilters = clearFilters) &&  
	     (((gytype !== 'number') &&  
	      <div style={{ padding: 8 }}>
		<Input
		  ref={node => {
		    this.searchInput = node;
		  }}
		  placeholder={`${title} like `}
		  value={selectedKeys[0]}
		  onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
		  onPressEnter={() => this.handleSearch(selectedKeys, confirm, dataIndex, gytype)}
		  style={{ width: 188, marginBottom: 8, display: 'block' }}
		/>
		<Space>
		  <Button
		    type="primary"
		    onClick={() => this.handleSearch(selectedKeys, confirm, dataIndex, gytype)}
		    icon={<SearchOutlined />}
		    size="small"
		    style={{ width: 90 }}
		  >
		    Search
		  </Button>
		  <Button onClick={() => this.handleReset(clearFilters)} size="small" style={{ width: 90 }}>
		    Clear
		  </Button>
		</Space>
	      </div>) ||
	      (
	      <div style={{ padding: 8 }}>
	      <Space>
	      <span><i><strong>{title}</strong></i></span>
	      <Radio.Group defaultValue={1}  onChange={(e) => {
		      const 		num = Number(e.target?.value);

		      this.setState({radioopt : num});
		      this.radioopt = num;
		      }} >
		<Radio style={filRadioStyle} value={1}> = </Radio>
		<Radio style={filRadioStyle} value={2}> &lt; </Radio>
		<Radio style={filRadioStyle} value={3}> &gt; </Radio>
	      </Radio.Group>
		
		<InputNumber
		  ref={node => {
		    this.searchInput = node;
		  }}
		  value={selectedKeys[0]}
		  onChange={val => setSelectedKeys([String(val)])}
		  onPressEnter={() => this.handleSearch(selectedKeys, confirm, dataIndex, gytype)}
		  style={{ marginBottom: 8, display: 'block' }}
		/>
		  <Button
		    type="primary"
		    onClick={() => this.handleSearch(selectedKeys, confirm, dataIndex, gytype)}
		    icon={<SearchOutlined />}
		    size="small"
		    style={{ width: 90 }}
		  >
		    Search
		  </Button>
		  <Button onClick={() => this.handleReset(clearFilters)} size="small" style={{ width: 90 }}>
		    Clear
		  </Button>
		</Space>
	      </div>
		
	      ))
	    );

	    outcol.filterIcon = filtered => dataIndex && ( (!filtered && <SearchOutlined style={{ color: '#1890ff' }} />) || 
		(<Button onClick={() => this.handleReset(this.tclearFilters)} size="small"> x </Button>));

	    outcol.onFilter = (value, record) => {
	       /*console.log(`onFilter called for column ${dataIndex} for value ${value} and gytype ${gytype} : radioopt = ${this.radioopt}`);*/

               if (this.modalCount && this.searchActive === 0) {
                   this.searchActive++;
                   this.modalCount(true);
               } 	    

	       if (gytype !== 'number') {

		  if (gytype === 'string') {

                      if (this.state.searchText === value && this.regexp) {   			  
		      }
		      else {
			  if (this.searchTimeset === false || !this.regexp) {
			       this.searchTimeset = true;
			       this.regexp = new RegExp(value, "i");

			       setTimeout(() => {
    					this.setState({
      						searchText: value,
					});	
				    }, 0);   
			  }	  
                      }			      
		      return this.regexp.test(record[dataIndex].toString());
	          }  
		  return record[dataIndex].toString().toLowerCase().includes(value.toLowerCase());
	       }
	       else {
		   const num = Number(record[dataIndex]), valnum = Number(value);   

		   if (this.radioopt === 2) {
		      return num < valnum;
		   }		   
		   else if (this.radioopt === 3) {
		      return num > valnum;
		   }		   
		   else return num === valnum;
	       }	       
	    };

	    outcol.onFilterDropdownVisibleChange = visible => {
	      if (visible) {
		setTimeout(() => this.searchInput?.select());
	      }
	    };

	 }   

	  if (dataIndex) {
	    if (gytype === 'number' || gytype === 'boolean') {
	       if (!propcol.sorter) {
		  outcol.sorter = (a, b) => {
		     return GyTable.NumCompare(a[dataIndex], b[dataIndex]);
		  };
	       }

	       if (!propcol.sortDirections) {
		  outcol.sortDirections = ['descend', 'ascend'];
	       }	     
	    }   
	    else if (gytype === 'string' && !propcol.sorter) {
		  outcol.sorter = (a, b) => {
		     return GyTable.TextLocaleCompare(a[dataIndex], b[dataIndex]);
		  };
	    }	  

	    if (!propcol.render) {
	       if (gytype !== 'boolean') {	    
	       outcol.render = text => 
		this.state.searchedColumn === dataIndex ? (
		  <Highlighter
		    highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
		    searchWords={[this.state.searchText]}
		    autoEscape
		    textToHighlight={text.toString()}
		  />     
	       ) : (text);
	       }
	       else {
		   outcol.render = (val) => (val.toString());
	       }	       
	    }
	  }
		
	  return outcol;
  };

  handleSearch = (selectedKeys, confirm, dataIndex, gytype) => {
    confirm();
    this.setState({
      searchText: selectedKeys[0],
      searchedColumn: dataIndex,
    });

    this.regexp = (gytype === 'string' ? new RegExp(selectedKeys[0], "i") : null);
  };

  handleReset = clearFilters => {
    /*console.log(`handleReset called clearFilters is ${clearFilters.toString()} typeof clearFilters is ${typeof clearFilters}`);	   */
    clearFilters();

    this.setState({ searchText: ''});
    this.regexp = null;
    this.radioopt = 1;

    if (this.searchActive > 0 && this.modalCount) {
        this.searchActive--;
	this.modalCount(false);
    } 	    
  };
  
  componentDidMount() {
	/*console.log('Mounted Table now..');*/

	this.updColumns = this.props.columns.map((col) => {

		const filopt = this.addColumnProps(col.dataIndex, (typeof col.title === 'string') ? col.title : col.dataIndex, col.gytype, col);

		if (this.props.gyprefilter?.searchedColumn === col.dataIndex) {
			filopt.filteredValue = [this.props.gyprefilter.searchText];
		}

		return LodashMerge(col, filopt);
	});
  }

  onChange = (pagination, filters, sorter, extra) => {
     if (sorter && (sorter.field !== this.sorterField || sorter.order !== this.sorterOrder)) {
        this.sorterField = sorter.field;
        this.sorterOrder = sorter.order;
	this.setState({ currPage : 1 });
     }
     else if (pagination) {
	this.setState({ currPage : pagination.current });
     }	     
  };
	  
  static TextLocaleCompare(a, b)
  {
     return a.localeCompare(b);
  }	  

  static NumCompare(a, b)
  {
     return a - b;
  }

  static DateISOCompare(a, b)
  {
     return moment(a, moment.ISO_8601).unix() - moment(b, moment.ISO_8601).unix();
  }	  

  render() {
     return <Table {...this.props} columns={this.updColumns ?? this.props.columns} showSorterTooltip={this.props.showSorterTooltip ?? false} 
              pagination={{ showTotal : pageShowTotal, current : this.state.currPage, itemRender : itemRender }} onChange={this.onChange} onRow={this.props.onRow ?? this.props.tableOnRow} />;
  }
}

export function TimeFieldSorter(a, b)
{
	return GyTable.DateISOCompare(a["time"], b["time"]);
}

export function NumFieldSorter(field)
{
	return function(a, b) {
		return GyTable.NumCompare(a[field], b[field]);
	};	
}

export function TextFieldSorter(field)
{
	return function(a, b) {
		return GyTable.TextLocaleCompare(a[field], b[field]);
	};	
}


