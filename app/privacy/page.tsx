import type {Metadata} from 'next';
import {PolicyPage} from '@/components/policy-page';
import {privacySections} from '@/lib/policies';
export const metadata:Metadata={title:'Privacy notice · ChessBuddy'};
export default function Privacy(){return <PolicyPage title="Privacy notice" sections={privacySections}/>;}
