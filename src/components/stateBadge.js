
import React from 'react';
import { Badge } from 'antd';

import {getStateColor} from './util.js'

function StateBadge(state, text = null)
{
	const		color = getStateColor(state);

	return <Badge color={color} text={text || state} />;
}	

export { getStateColor, StateBadge };

