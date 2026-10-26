import type {Metadata} from 'next';
import {PolicyPage} from '@/components/policy-page';
import {termsSections} from '@/lib/policies';
export const metadata:Metadata={title:'Terms of use · ChessBuddy'};
export default function Terms(){return <PolicyPage title="Terms of use" sections={termsSections}/>;}
