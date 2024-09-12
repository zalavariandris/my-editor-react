import React, { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as astrocite from 'astrocite-bibtex';
import { type Bibliography, type CitationItem, type ReferenceItem } from './bibliography';
import {CSL} from "./vendor/citeproc_commonjs.js"
import _, { groupBy } from "lodash"

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

type CiteProcCluster = [
	{bibchange: boolean, citation_erros:any[]},
	[number/*?*/, string/*HTML*/, string/*generated citationid*/]
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
					"citationItems":[
						{"id":"balaraman_1962"},
						{"id":"biederman_1987"}
					],
					"properties":{"noteIndex":0}
				},
				[],
				[]
			]
		];
		return JSON.parse(xhr.responseText);
	}

	/* state */
	const [sourceCitations, setSourceCitations] = useState<any[]>(makeDummyCitations());
	const [references, setReferences] = useState<ReferenceItem[]>([]);
	const [styleXMLString, setStyleXMLString] = useState<string|null>(null);

	/* computed */
	const [selectedStyleName, setSelectedStyleName] = useState<string>("jm-chicago-fullnote-bibliography");
	const [citeMode, setCiteMode] = useState<"note" | "in-text">("note")

	const [bibliography, setBibliography] = useState<{ref_id:string, html:string}[]>([]);
	const [citationClusters, setCitationClusters] = useState<{cit_id:string, html:string}[]>([]);

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
		console.log("effect1")
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
		// citeproc.current.updateItems(references.map(ref=>ref.id));
		// console.log("citeproc updated")
		// window.citeproc = citeproc.current
		// setCiteMode(citeproc.current.opt.class);
	}, [references, styleXMLString])

	useEffect(()=>{
		console.log("effect2")
		if(!citeproc.current){
			return;
		}
		
		// process citations

		const clusters = sourceCitations.map(citation=>{
			return citeproc.current.processCitationCluster(citation[0], citation[1], []);
		});

		setCitationClusters(clusters.map(cluster=>{
			const {bibchange, citation_errors} = cluster[0];
			const [_, html, cit_id] = cluster[1];
			return {cit_id, html};
		}))

		// make bibliography
		const bib = citeproc.current.makeBibliography();
		console.group("process all citations and bibliography");
		console.log("clusters:", clusters)
		console.log("bibliography:", bib);
		console.groupEnd();

		setBibliography(_.zip(bib[0].entry_ids, bib[1]).map( ([ref_id, html])=>{
			return {ref_id, html};
		}));

		// generate bibliography
	}, [sourceCitations, references, styleXMLString])

	return (
		<>
		<div>
			<textarea value={text} onChange={(e)=>setText(e.target.value)}></textarea>
		</div>
		<div>
			<select id="citation-styles" value={selectedStyleName} onChange={e=>setSelectedStyleName(e.target.value)}>
				{styles.map(style=>(
					<option key={style.name} value={style.name}>{style.nicename}</option>
				))}
			</select>
			<div>
				<h2>Citation clusters</h2>
				{!citationClusters || citationClusters.map(item=>(
					<div key={item.cit_id} dangerouslySetInnerHTML={{__html: `@${item.cit_id}${item.html}`}}></div>
				))}
			</div>
			<div>
				<h2>Bibliography</h2>
				{!bibliography || bibliography.map(item=>(
					<div key={item.ref_id} dangerouslySetInnerHTML={{__html: `@${item.ref_id}${item.html}`}}></div>
				))}
			</div>
			
		</div>
		</>
	)
}

export default App
