type DocumentSegment = {
	type: "text" | "emphasis" | "strong" | "tag" | "mention";
	content: string
};

type DocumentBlock = {
	type: "h1" | "p";
	content: DocumentSegment[]
};

type DocumentModel = DocumentBlock[];

function parseMarkdownLine(text:string):DocumentSegment[] {
	// Define regex patterns for different markdown elements
	const strongRegexp = /\*\*[^*]+\*\*/g;
	const emphasisRegexp = /_[^_]+_/g;
	const mentionRegexp = /@\w+/g;
	const tagRegexp = /#\w+/g;
	
	// Master regex pattern to match any markdown element
	const masterRegexp = new RegExp(
		`(${strongRegexp.source})|(${emphasisRegexp.source})|(${mentionRegexp.source})|(${tagRegexp.source})`,
		'g'
	);
	
	const segments:DocumentSegment[] = [];
	let lastIndex = 0;
	let match;
	
	// Iterate over all matches in the text
	while ((match = masterRegexp.exec(text)) !== null) {
		const [segment] = match;
		
		// Add any plain text before this markdown match
		if (match.index > lastIndex) {
			const plainText = text.slice(lastIndex, match.index);
			if (plainText) {
				segments.push({ type: "text", content: plainText });
			}
		}
		
		// Determine the type of the segment based on the regex match
		if (segment.match(strongRegexp)) {
			segments.push({ type: "strong", content: segment });
		} else if (segment.match(emphasisRegexp)) {
			segments.push({ type: "emphasis", content: segment });
		} else if (segment.match(mentionRegexp)) {
			segments.push({ type: "mention", content: segment });
		} else if (segment.match(tagRegexp)) {
			segments.push({ type: "tag", content: segment });
		}
		
		// Update lastIndex to the end of the current match
		lastIndex = match.index + segment.length;
	}
	
	// Add any remaining text after the last markdown match
	if (lastIndex < text.length) {
		const remainingText = text.slice(lastIndex);
		if (remainingText) {
			segments.push({ type: "text", content: remainingText });
		}
	}
	
	return segments;
}

/**
 * Parses a Markdown string and converts it into a structured document model.
 *
 * @param {string} source - The Markdown source string to be parsed.
 * @returns {DocumentModel} The parsed document model representing the structured
 *                          content of the input Markdown.
 */
function parseMarkdown(source:string): DocumentModel{
    const doc:DocumentModel = source.split("\n").map(line=>{
		const segments = parseMarkdownLine(line);
        if(line.startsWith("# ")){
			const header:DocumentBlock = {type: "h1", content: segments};
            return header;
        }
        else{
			const paragraph:DocumentBlock = {type: "p", content: segments};
            return paragraph;
        }
    });
    return doc;
}

function getMentionsFromDocument(doc:DocumentModel){
	return doc.reduce((accumulator:any[], currentValue)=>[...accumulator, ...currentValue.content], [])
		.filter(segment=>segment.type=="mention");
}


// window.setTextSelection = setTextSelection;
// window.getTextSelection = getTextSelection;
// window.modifyTextSelection = modifyTextSelection;


export type {DocumentModel, DocumentBlock, DocumentSegment};
export {parseMarkdown, parseMarkdownLine};
