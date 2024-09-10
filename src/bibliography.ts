import type { Data } from 'csl-json';
import * as astrocite from 'astrocite-bibtex';
import {CSL} from "./vendor/citeproc_commonjs.js"
/* *********************** *
 * Bibliographic Referenes *
 * *********************** */
type ReferenceItem = Data;

async function fetchReferences(url:string):Promise<ReferenceItem[]> {
	const result = await fetch(url);
	const text = await result.text();
	return astrocite.parse(text);
}


/* ************** *
* CITATIONS DATA *
* ************** */
type CitationItem = {
	/*see: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html*/
	"id":string;
	"locator"?: string | number;
	"label"?: "appendix" //a label type, indicating whether the locator is 
	//to a page, a chapter, or other subdivision of the target resource
			| "article-locator"
			| "book"
			| "canon"
			| "chapter"
			| "column"
			| "elocation"
			| "equation"
			| "figure"
			| "folio"
			| "issue"
			| "line"
			| "note"
			| "opus"
			| "page"
			| "paragraph"
			| "part"
			| "rule"
			| "section"
			| "sub-verbo"
			| "supplement"
			| "table"
			| "timestamp"
			| "title"
			| "verse"
			| "volume"; 
	"prefix"?: string;
	"suffix"?: string;
	"suppress-author"?:boolean;
	"author-only"?:boolean;
	"position"?:number;
	"near-note"?: boolean;
}

type Citation = {
	/*see: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html*/
	citationItems: CitationItem[];
	properties: {
		noteIndex: number,
		mode?:"author-only" | "suppress-author" | "composite",
		infix?: string
	};
}

function parsePandocToCitation(mention:string){
    return {
        citationItems:[{
            "id": mention.slice(1),
            "locator": 123,
            "label": "page",
            "prefix": "See ",
            "suffix": " (arguing that X is Y)"
        }],
        properties: {
            noteIndex: 1
        }
    }
};

/* ==================== */

type CSLStyleID = "apa";

async function fetchCSLStyle(styleID: CSLStyleID) {
	const response = await fetch(`https://raw.githubusercontent.com/citation-style-language/styles/master/${styleID}.csl`);
	const csl = await response.text();
	return csl;
}


// Initialize a system object, which contains two methods needed by the
// engine.
var xhr = new XMLHttpRequest();


// Given the identifier of a CSL style, this function instantiates a CSL.Engine
// object that can render citations in that style.

function getProcessor(references: ReferenceItem[], style:string) {
	// Instantiate and return the engine
	var citeproc = new CSL.Engine({
		retrieveLocale: function (lang:string) {
			xhr.open('GET', `https://raw.githubusercontent.com/Juris-M/citeproc-js-docs/master/locales-${lang}.xml`, false);
			xhr.send(null);
			return xhr.responseText;
		},
		retrieveItem: function(id:string) {
			const itemIdx = references.findIndex((item)=>item.id==id)
			return references[itemIdx];
		}
	}, style);
	return citeproc;
};

type FormattingParameters = {
	maxoffset: number;
	entryspacing: number;
	linespacing: number;
	hangingindent: boolean;
	"second-field-align": boolean;
	bibstart: string;
	bibend: string;
	bibliography_errors: any[];
	entry_ids: string[];
}

type Bibliography = [
	FormattingParameters,
	string[]
];

function getBibliography(references:ReferenceItem[], style:string) {
	var citeproc = getProcessor(references, style);
	// var citationsPre = [ ["adolph.etal_2014", 1] ];
	// var citationsPost = [ ["adolph.etal_2014", 1] ];
	// var result = citeproc.processCitationCluster(citations[0], [], []);
	citeproc.updateItems(references.map(ref=>ref.id));
	const bibliography:Bibliography = citeproc.makeBibliography();
	return bibliography;
}

function getCiteCluster(references:ReferenceItem[], style:string, id:string){
	var citeproc = getProcessor(references, style);
	const citation = citeproc.processCitationCluster({
		citationItems: [
			{id: 'sacks_2022'}
		],
		properties: {
			noteIndex:5
		}
	}, [], []);
	return citation;
}

export type {ReferenceItem, 
            Citation, 
            CitationItem, 
            Bibliography, 
            FormattingParameters};

export {fetchReferences, 
	fetchCSLStyle,
	getBibliography,
	getCiteCluster};

async function example(){
	const styleID = "apa";
    const [references, style] = await Promise.all([await fetchReferences("./ref.bib"), await fetchCSLStyle(styleID)]);
    console.log("references:", references);
	// console.log("style:", style);

	// get bibliography
    const bibliography = getBibliography(references, style);
    console.log("bibliography:", bibliography);

	// footnote and intext citations
	var citationsPre = [ ["citation-quaTheb4", 1], ["citation-mileiK4k", 2] ];
	var citationsPost = [ ["citation-adaNgoh1", 4] ];
	
	var citeproc = getProcessor(references, style);
	const citation = citeproc.processCitationCluster({
		citationItems: [
			{id: 'sacks_2022'}
		],
		properties: {
			noteIndex:1
		}
	}, [], []);
	console.log("citation:", citation)

	// const citations = getCitationCluster(citations, references);
}
export {example};