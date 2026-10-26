import {contactEmail,policyDate,publisher,type PolicySection} from '@/lib/policies';
export function PolicyPage({title,sections}:{title:string;sections:PolicySection[]}){
 return <main className="landing policy"><p className="eyebrow">CHESSBUDDY</p><h1>{title}</h1><p>Effective {policyDate} · {publisher}</p>{sections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</section>)}<p>Contact: <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p></main>;
}
