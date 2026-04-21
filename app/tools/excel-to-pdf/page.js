import OfficeToPdfPage from '@/components/OfficeToPdfPage';

export default function ExcelToPdf() {
  return (
    <OfficeToPdfPage 
      title="Excel to PDF"
      description="Make XLS and XLSX spreadsheets easy to read by converting them to PDF."
      accept=".xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    />
  );
}
