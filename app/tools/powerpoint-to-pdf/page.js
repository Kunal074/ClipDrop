import OfficeToPdfPage from '@/components/OfficeToPdfPage';

export default function PowerPointToPdf() {
  return (
    <OfficeToPdfPage 
      title="PowerPoint to PDF"
      description="Make PPT and PPTX slideshows easy to view by converting them to PDF."
      accept=".ppt, .pptx, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation"
    />
  );
}
