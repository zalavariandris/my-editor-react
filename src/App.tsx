import React, { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as astrocite from 'astrocite-bibtex';
import { type Bibliography, type CitationItem, type ReferenceItem } from './bibliography';
import {CSL} from "./vendor/citeproc_commonjs.js"
import _ from "lodash"

const h = React.createElement;

const styles:{name: string, nicename:string, url:string}[] = [
	{
		name:"acm-sig-proceedings", 
		nicename:"ACM Proceedings",
		url: "https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/acm-sig-proceedings.csl"
		
	},
	{
		name:"american-medical-association", 
		nicename:"AMA",
		url: "https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/american-medical-association.csl"
	},
	{
		name:"chicago-author-date", 
		nicename:"Chicago (author-date)",
		url:"https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/chicago-author-date.csl"
	},
	{
		name:"jm-chicago-fullnote-bibliography", 
		nicename:"Chicago (full note)",
		url: "https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/jm-chicago-fullnote-bibliography.csl"
	},
	{
		name:"din-1505-2-alphanumeric", 
		nicename:"DIN-1505-2 (alpha)",
		url: "https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/din-1505-2-alphanumeric.csl"
	},
	{
		name:"jm-indigobook", 
		nicename: "JM Indigo",
		url: "https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/jm-indigobook.csl"
	},
	{
		name:"jm-indigobook-law-review", 
		nicename: "JM Indigo (L. Rev.)",
		url: "https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/jm-indigobook-law-review.csl"
	},
	{
		name:"jm-oscola", 
		nicename:"JM OSCOLA",
		url: "https://citeproc-js.readthedocs.io/en/latest/_static/data/styles/jm-oscola.csl"
	}
];

function App() {
	const [text, setText] = useState(`Oliver Sacks író és neurológus, a magyar nyelven is elérhető 
_A férfi, aki kalapnak nézte a feleségét_ és az _Antropológus a Marson_ című 
könyveiben pácienseinek különös neurológiai zavaraival foglalkozik.
`)

	function makeDummyCitations(){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://raw.githubusercontent.com/Juris-M/citeproc-js/master/demo/citations-1.json', false);
		xhr.send(null);
		return [
			[
				{
					"citationID":"SXDNEKR5AD",
					"citationItems":[{"id":"balaraman_1962"}],
					"properties":{"noteIndex":0}
				},
				[],
				[]
			]
		];
		return JSON.parse(xhr.responseText);
	}

	const [citations, setCitations] = useState<any[]>(makeDummyCitations());
	const [references, setReferences] = useState<ReferenceItem[]>([]);
	const [styleXMLString, setStyleXMLString] = useState<string|null>(null);
	const [selectedStyleName, setSelectedStyleName] = useState<string>("jm-chicago-fullnote-bibliography");
	const [citeMode, setCiteMode] = useState<"note" | "in-text">("note")

	function footnoteOrInTextStyle():("note"|"in-text"){
		return "note";
	}

	/* SETUP */
	useEffect(()=>{
		// fetch references
		fetch("./ref.bib")
			.then((result)=>result.text())
			.then((text)=>astrocite.parse(text))
			.then(setReferences)
			.catch(error=>{
				console.error("cant access ref.bib", error);
			});
	},[])

	useEffect(()=>{
		// fetch style and language
		const style = styles.find(item=>item.name==selectedStyleName);
		fetch(style.url)
			.then(response=>response.text())
			.then(setStyleXMLString)
			.catch(error=>{
				console.error(`cant access style from url: ${style.url}`, error);
			});
	}, [selectedStyleName])

	const citeproc = useRef<any>(null)
	useEffect(()=>{
		if(!references || !styleXMLString){
			return;
		}
		// Instantiate and return the engine
		var xhr = new XMLHttpRequest();
		citeproc.current = new CSL.Engine({
			retrieveLocale: function (lang:string) {     
				const url = `https://raw.githubusercontent.com/citation-style-language/locales/master/locales-${lang}.xml`
				xhr.open('GET', url, false);
				xhr.send(null);
				return xhr.responseText;
			},
			retrieveItem: function(id:string) {
				const itemIdx = references.findIndex((item)=>item.id==id)
				return references[itemIdx];
			}
		}, styleXMLString);
		citeproc.current.updateItems(references.map(ref=>ref.id));
		console.log("citeproc updated")
		window.citeproc = citeproc.current
		setCiteMode(citeproc.current.opt.class);
	}, [references, styleXMLString])

	/* process citation and bibliography */
	function getBibliographyItems():{ref:string, bib:string}[] | null{
		if(!citeproc.current){
			return null;
		}

		const result = _.zip(references, citeproc.current.makeBibliography()[1])
			.map( ([ref, bib])=>{
				return {ref, bib};
			} );

		return result;
	}

	function getCitationCluster(citationParams){
		if(!citeproc.current){
			return null;
		}
		const citationCluster = citeproc.current.processCitationCluster(citationParams[0], citationParams[1], []);
		return citationCluster;
	}
	
	return (
		<>
		<div>
			<textarea value={text} onChange={(e)=>setText(e.target.value)}></textarea>
		</div>
		<div>
			<select id="citation-styles" value={selectedStyleName} onChange={e=>setSelectedStyleName(e.target.value)}>
				{styles.map(style=>(
					<option value={style.name}>{style.nicename}</option>
				))}
			</select>
			{citeMode}
			{citeMode=="in-text" ? (
				<div>
					<h2>In-text citations</h2>
					<ul>
					{citations.map( (citation, idx)=>{
						console.log("citation", citation)
						const citationCluster = getCitationCluster(citation);
						if(!citationCluster){
							return "";
						}
						const [_, citationStrings] = citationCluster;
						const [n, citationText, citationID] = citationStrings;
						return (<li key={idx}>
							<p>{`${citationCluster[1][0][1]}`}</p>
						</li>)
					})}
					</ul>
				</div>
			) : ""}
			{citeMode=="note" ? (
				<div>
					<h2>Footnotes</h2>
					<ul>
					{citations.map( (citation, idx)=>{
						const citationCluster = getCitationCluster(citation);
						if(!citationCluster){
							return "";
						}
						const [_, citationStrings] = citationCluster;
						const [n, citationText, citationID] = citationStrings;
						return (<li key={idx}>
							{/* <p>{`${citation} ${citation.id}`}</p> */}
							{/* <p>{`bibchange: ${getCitationCluster(citation)?getCitationCluster(citation)[0].bibchange:""}`}</p> */}
							<p dangerouslySetInnerHTML={{__html: `${citationCluster[1][0][1]}`}}></p>
						</li>)
					})}
					</ul>
				</div>
			) : ""}
			<div>
				<h2>Bibliography</h2>
				<ul>
					{getBibliographyItems()?.map( (item, idx)=>(
						<li key={idx}>
							<span>{`[@${item.ref.id}]`}</span>
							<span dangerouslySetInnerHTML={ {__html: item.bib} }></span>
						</li>
					))}
				</ul>
			</div>
		</div>
		</>
	)
}

export default App
