#!/bin/bash -x

if [ -z "$1" ]; then
	echo -e "\n\nUsage : $0 <nodewebserver Install Dir>\n\n"
	exit 1
fi	

if [ ! -d ./build ]; then
	echo -e "\n\nERROR : ./build directory not found. Please run the following command first : yarn build \n\n"
	exit 1
fi

NODEDIR=$1

if [ ! -d ${NODEDIR}/frontend ]; then
	echo -e "\n\nERROR : Node Install Dir ${NODEDIR}/frontend directory not found. Please specify a valid Node Install dir...\n\n"
	exit 1
fi	

rm -rf ${NODEDIR}/frontend/build 2> /dev/null

cp -a ./build ${NODEDIR}/frontend/

if [ $? -ne 0 ]; then
	echo -e "\n\nERROR : Failed to copy ./build to Node install dir ${NODEDIR}/frontend/\n\n"
	exit 1
fi

echo -e "\nInstalled Frontend Web App to nodewebserver successfully...\n"

exit 0

