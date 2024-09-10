import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import * as astrocite from 'astrocite-bibtex';
import { type Bibliography, type CitationItem, type ReferenceItem } from './bibliography';
import {CSL} from "./vendor/citeproc_commonjs.js"

function App() {
	const [text, setText] = useState(`Oliver Sacks író és neurológus, a magyar nyelven is elérhető 
_A férfi, aki kalapnak nézte a feleségét_ és az _Antropológus a Marson_ című 
könyveiben pácienseinek különös neurológiai zavaraival foglalkozik.
`)

	const [citations, setCitations] = useState<any[]>([]);
	const [references, setReferences] = useState<ReferenceItem[]>([]);
	const [style, setStyle] = useState<string|null>(null);

	const styles = {
		"apa": "https://www.zotero.org/styles/apa",
		"chicago-note": "https://www.zotero.org/styles/chicago-note-bibliography-with-ibid",
		"chicago-fullnote": "https://www.zotero.org/styles/chicago-fullnote-bibliography"
	};

	/* SETUP */
	useEffect(()=>{
		// fetch references
		fetch("./ref.bib")
			.then((result)=>result.text())
			.then((text)=>astrocite.parse(text))
			.then(setReferences);
		
		// fetch style and language
		fetch(styles.apa)
			.then(response=>response.text())
			.then(setStyle);
	},[])

	const citeproc = useRef<any>(null)
	useEffect(()=>{
		if(!references || !style){
			return;
		}
		// Instantiate and return the engine
		var xhr = new XMLHttpRequest();
		citeproc.current = new CSL.Engine({
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
	}, [references, style])

	/* process citation and bibliography */
	function getBibliographyItems():Bibliography | null{
		if(!citeproc.current){
			return null;
		}
		citeproc.current.updateItems(references.map(ref=>ref.id));
		return citeproc.current.makeBibliography()[1];
	}

	
	return (
		<>
		<textarea value={text} onChange={(e)=>setText(e.target.value)}></textarea>
		<div>
			<h2>Citations</h2>
			{citations.map( ([citation, idx])=>{
				return <p key={idx}>{citation}</p>
			})}
		</div>
		<div>
			<h2>Bibliography</h2>
			{getBibliographyItems()?.map( (item)=>{
				return <p dangerouslySetInnerHTML={}>{String(item)}</p>
			})}
		</div>
		</>
	)
}

export default App
