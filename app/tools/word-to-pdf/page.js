import OfficeToPdfPage from '@/components/OfficeToPdfPage';

export default function WordToPdf() {
  return (
    <OfficeToPdfPage 
      title="Word to PDF"
      description="Make DOC and DOCX files easy to read by converting them to PDF."
      accept=".doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    />
  );
}
