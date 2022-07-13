
import 		TinyQueue from'tinyqueue';

export class FixedPrioQueue
{
	constructor(fixlen, compare)
	{
		if (typeof compare !== 'function') {
			throw new Error("Invalid compare parameter for FixedPrioQueue");
		}

		this.prioq_ 	= new TinyQueue([], compare);
		this.compare_	= compare;
		this.fixlen_	= fixlen;
	}	

	pushdata = (data) => {

		if (this.prioq_.length < this.fixlen_) {
			this.prioq_.push(data);
			return;
		}

		if (this.compare_(data, this.prioq_.peek()) > 0) {
			this.prioq_.pop();
			this.prioq_.push(data);
		}
	};	

	size = () => {
		return this.prioq_.length;
	};

	walk_unsorted = (callback) => {
		if (typeof callback !== 'function') return;

		for (let i = 0; i < this.prioq_.length; ++i) {
			callback(this.prioq_.data[i]);
		}	
	};	

	popsorted = (callback) => {
		if (typeof callback !== 'function') return;

		while (this.prioq_.length) {
			callback(this.prioq_.pop());
		}	
	};	
}


