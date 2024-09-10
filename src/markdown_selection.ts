type TextSelection = {
	start:number, 
	end:number, 
	direction:"forward"|"backward"|"none"
};

function isBlock(node:Node){
	if(node.nodeType == Node.ELEMENT_NODE && window.getComputedStyle(node as HTMLElement).display=="block"){
		return true;
	}
	return false;
}

function isSegment(node:Node){
	return node.parentElement && isBlock(node.parentElement);
}

function getBlockElement(node:HTMLElement | Text):HTMLElement
{
	let element = node.parentElement;
	if(!element)
		throw new Error(`textNode has no parent element`)
	
	while(element.parentElement && !isBlock(element)){
		element = element.parentElement;
	}
	
	return element;
}

function getSegmentNode(node:HTMLElement | Text):HTMLElement | Text{
	const blockElement = getBlockElement(node);
	while(node.parentElement != blockElement) {
		node = node.parentElement!;
	}
	return node;
}

/* ********************* *
 * Handle Text Selection *
 * ********************* */
function getTextSelection(root:HTMLElement):TextSelection|null{
	console.assert(root?true:false);
	
	const currentSelection = window.getSelection();
	if(!currentSelection || !currentSelection.rangeCount){
		return null;
	}
	
	let start = undefined;
	let end = undefined;
	
	let stack = [...root.childNodes]
	
	let prevPos = 0;
	let position = 0;
	while(stack.length>0)
		{
		prevPos = position;
		const node:Node = stack.shift()!;
		
		if(isBlock(node) && node.textContent==""){
			position+=1;
		}
		else if (node.nodeType==Node.TEXT_NODE) {
			const textNode = node as Text;
			position+=textNode.length;
			if(!getSegmentNode(textNode).nextSibling){
				position+=1;
			}
		}
		else {
			stack = [...node.childNodes, ...stack];
		}
		
		if(!start!=undefined && currentSelection.anchorNode == node){
			start = prevPos+currentSelection.anchorOffset;
		}
		
		if(!end!=undefined && currentSelection.focusNode == node){
			end = prevPos+currentSelection.focusOffset;
		}
		
		if (end!=undefined && start!=undefined) {
			if(start<=end){
				return {start: start, end: end, direction: "forward"};
			}else{
				return {start: end, end: start, direction: "backward"};
			}
		}
	}
	return null;
}

function clearTextSelection(root:HTMLElement) {
	const currentSelection = window.getSelection();
	if (currentSelection){
		currentSelection.empty();
	}
}

function setTextSelection(root: HTMLElement, 
						  selection: TextSelection)
{
	console.assert(root?true:false);
	
	if (selection.start > selection.end) {
		selection.start = selection.end;
	}
	
	let startNode = null;
	let startOffset = 0;
	let endNode = null;
	let endOffset = 0;
	
	let stack = [...root.childNodes];
	
	
	let position = 0;
	let prevPos = position;
	while(stack.length>0)
		{
		const node:ChildNode|undefined = stack.shift();
		if (!node) {
			break;
		}
		
		if (isBlock(node) && node.textContent == "") {
			position+=1;  // handle empty block nodes
		}
		else if (node.nodeType==Node.TEXT_NODE) {
			const textNode = node as Text;
			prevPos = position;
			position+=textNode.length;
			if (!getSegmentNode(textNode).nextSibling) {
				position+=1;
			}
		}
		else {
			stack = [...node.childNodes, ...stack];
		}
		
		if (!startNode && position > selection.start) {
			startNode = node;
			if (isBlock(node)) {
				startOffset == 0; // handle empty block nodes
			}
			else {
				startOffset = selection.start-prevPos;
			}
		}
		
		if (!endNode && position > selection.end) {
			endNode = node;
			if (isBlock(node)) {
				endOffset = 0;  // handle empty block nodes
			}
			else {
				endOffset = selection.end-prevPos;
			}
		}
		
		if(startNode && endNode) {
			const currentSelection = window.getSelection();
			if(selection.direction=="forward") {
				currentSelection!.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
			}
			else if(selection.direction == "backward") {
				currentSelection!.setBaseAndExtent(endNode, endOffset, startNode, startOffset);
			}
			return;
		}
	}
}

function collapseTextSelectionToStart(selection: TextSelection) {
	return {start: selection.start, end: selection.start, direction: selection.direction};
}

function collapseTextSelectionToEnd(selection: TextSelection) {
	return {start: selection.end, end: selection.end, direction: selection.direction};
}

function modifyTextSelection(alter:"move"|"extend", 
							 direction:"forward"|"backward"|"left"|"right", 
							 granularity:"character"|"word"|"line"|"lineboundary", 
							 selection:TextSelection):TextSelection {
	if(granularity == "character"){
		if (alter == "move") {
			if(direction=="forward" || direction=="right")
				return {start: selection.start+1, end: selection.end+1, direction: selection.direction};
			if(direction=="backward" || direction=="left")
				return {start: selection.start-1, end: selection.end-1, direction: selection.direction};
		}
		
		else if(alter == "extend") {
			if(direction=="forward" || direction=="right") {
				if(selection.direction == "forward")
					return {start: selection.start, end: selection.end+1, direction: selection.direction};
				if(selection.direction == "backward")
					return {start: selection.start+1, end: selection.end, direction: selection.direction};
			}
			if(direction=="backward" || direction=="left")
				if (selection.direction == "forward") {
				if (selection.start == selection.end) {
					return {start: selection.start-1, end: selection.end, direction: "backward"};
				} else {
					return {start: selection.start, end: selection.end-1, direction: selection.direction};
				}
			}
			if(selection.direction == "backward")
				return {start: selection.start-1, end: selection.end, direction: selection.direction};
		}
	}
	
	return selection;
}

function setTextSelectionPosition(position:number, selection:TextSelection) {
	return {start: position, end: position, direction: selection.direction};
}

export type {TextSelection};
export {setTextSelection, 
        getTextSelection, 
        clearTextSelection, 
        modifyTextSelection, 
        collapseTextSelectionToStart, 
        collapseTextSelectionToEnd, 
        setTextSelectionPosition};