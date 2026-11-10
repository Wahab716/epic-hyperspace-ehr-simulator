export const reportMetadata={
 'Daily census':{grain:'Encounter',population:'Admitted at extraction',time:'Extraction instant',exclusions:'Non-admitted encounters',filters:'Department'},
 'Admissions':{grain:'Encounter',population:'Admission timestamp within [from,to)',time:'UTC admission',exclusions:'Outside interval',filters:'Department'},
 'Discharges':{grain:'Encounter',population:'Discharge timestamp within [from,to)',time:'UTC discharge',exclusions:'Missing discharge',filters:'Department'},
 'Length of stay':{grain:'Discharged encounter',population:'Discharges in interval',time:'UTC discharge',exclusions:'Missing discharge',filters:'Department',calculation:'Elapsed milliseconds / 86400000; two decimal places'},
 'No-show rate':{grain:'Appointment',population:'Noncancelled appointments in [from,to)',time:'UTC appointment',exclusions:'Cancelled',filters:'Date only',numerator:'No show',denominator:'All noncancelled appointments; zero denominator returns null'},
 'Unsigned notes':{grain:'Note',population:'Draft or Pended',time:'Full snapshot',exclusions:'Signed and Cosign Needed',filters:'None'},
 'Outstanding cosignatures':{grain:'Note',population:'Cosign Needed',time:'Full snapshot',exclusions:'All other statuses',filters:'None'},
 'Orders without results':{grain:'Order',population:'Noncancelled orders with no associated result',time:'Full snapshot',exclusions:'Cancelled and orders with results',filters:'None'},
 'Result turnaround':{grain:'Result',population:'All results',time:'Full snapshot',exclusions:'None; missing order time gives null',filters:'None',calculation:'Elapsed hours from order creation to latest result revision'},
 'Interface backlog':{grain:'Message',population:'Not Acknowledged',time:'Full snapshot',exclusions:'Acknowledged',filters:'None'},
 'Ticket resolution':{grain:'Resolved ticket',population:'Tickets with resolved timestamp',time:'Full snapshot',exclusions:'Unresolved',filters:'None',calculation:'Elapsed hours from created to resolved'}
};
