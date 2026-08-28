import { jsPDF } from 'jspdf';
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  images?: { data: string; mimeType: string; name?: string }[];
  modelUsed?: string;
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
}

export async function exportChatToPDF(
  session: ChatSession | null,
  messages: ChatMessage[]
): Promise<void> {
  if (!messages || messages.length === 0) {
    throw new Error('No messages to export');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  const sessionTitle = session?.title || 'Study Session Notes';
  const cleanTitle = sessionTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'Examix_Study_Notes';
  const formattedDate = new Date(session?.createdAt || Date.now()).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const addHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      // Modern Top Banner for Page 1
      doc.setFillColor(26, 26, 30);
      doc.roundedRect(margin, cursorY, contentWidth, 68, 6, 6, 'F');

      // Accent border line
      doc.setFillColor(74, 222, 128); // Emerald #4ADE80
      doc.rect(margin, cursorY, 6, 68, 'F');

      doc.setTextColor(74, 222, 128);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('EXAMIX AI  •  STUDY NOTES & EXAM DRILL', margin + 18, cursorY + 24);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const truncatedTitle = sessionTitle.length > 55 ? sessionTitle.substring(0, 52) + '...' : sessionTitle;
      doc.text(truncatedTitle, margin + 18, cursorY + 44);

      doc.setTextColor(160, 160, 175);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Generated: ${formattedDate}  |  Total Messages: ${messages.length}`, margin + 18, cursorY + 58);

      cursorY += 84;
    } else {
      // Running top header for subsequent pages
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.75);
      doc.line(margin, 28, pageWidth - margin, 28);

      doc.setTextColor(120, 120, 130);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('EXAMIX AI — STUDY NOTES', margin, 22);

      const titleShort = sessionTitle.length > 40 ? sessionTitle.substring(0, 38) + '...' : sessionTitle;
      doc.text(titleShort, pageWidth - margin, 22, { align: 'right' });
    }
  };

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin - 20) {
      doc.addPage();
      cursorY = 45;
      addHeader(false);
    }
  };

  // Draw Page 1 header
  addHeader(true);

  // Process each message
  for (let idx = 0; idx < messages.length; idx++) {
    const msg = messages[idx];
    const isUser = msg.role === 'user';

    if (isUser) {
      // User Question Card
      const cleanUserText = msg.content || '(Uploaded files/images for analysis)';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const splitUserLines = doc.splitTextToSize(cleanUserText, contentWidth - 28);
      const boxHeight = Math.max(36, splitUserLines.length * 13 + 24);

      checkPageBreak(boxHeight + 12);

      // Light slate question container
      doc.setFillColor(243, 246, 250);
      doc.setDrawColor(205, 218, 235);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 5, 5, 'FD');

      // Left blue tag bar
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(margin, cursorY, 4, boxHeight, 2, 2, 'F');

      // Badge
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`QUESTION #${Math.floor(idx / 2) + 1} (STUDENT)`, margin + 14, cursorY + 14);

      // User prompt text
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(splitUserLines, margin + 14, cursorY + 28);

      cursorY += boxHeight + 14;
    } else {
      // Assistant Response Card
      const modelLabel = msg.modelUsed ? `Examix AI (${msg.modelUsed})` : 'Examix AI Tutor';

      checkPageBreak(30);

      // AI Header Tag
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, cursorY, contentWidth, 20, 4, 4, 'FD');

      doc.setFillColor(34, 197, 94);
      doc.circle(margin + 10, cursorY + 10, 3, 'F');

      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(modelLabel.toUpperCase(), margin + 18, cursorY + 13.5);

      cursorY += 26;

      // Clean assistant content line by line
      const rawText = msg.content || '';
      // Clean SVG codes and raw image URLs if any for standard PDF text flow
      const textWithoutSvg = rawText.replace(/<svg[\s\S]*?<\/svg>/gi, '[Visual Explainer Diagram: View in Examix Interactive App]');

      const paragraphs = textWithoutSvg.split('\n');

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) {
          cursorY += 6;
          continue;
        }

        // Heading 1 / Title (### or ## or #)
        if (trimmed.startsWith('#')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          const splitHeading = doc.splitTextToSize(headingText, contentWidth - 10);
          const hHeight = splitHeading.length * 15;

          checkPageBreak(hHeight + 10);
          doc.setTextColor(15, 23, 42);
          doc.text(splitHeading, margin + 5, cursorY + 10);
          cursorY += hHeight + 8;
        }
        // Monospaced Code / Matrix Block (``` or | |)
        else if (trimmed.startsWith('```') || (trimmed.startsWith('|') && trimmed.endsWith('|'))) {
          const codeText = trimmed.replace(/```[a-zA-Z]*/g, '');
          if (!codeText.trim()) continue;

          doc.setFont('courier', 'bold');
          doc.setFontSize(8.5);
          const splitCode = doc.splitTextToSize(codeText, contentWidth - 24);
          const blockHeight = splitCode.length * 11 + 10;

          checkPageBreak(blockHeight + 6);
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(margin + 5, cursorY, contentWidth - 10, blockHeight, 3, 3, 'FD');

          doc.setTextColor(51, 65, 85);
          doc.text(splitCode, margin + 12, cursorY + 11);
          cursorY += blockHeight + 6;
        }
        // Exam Warning / Trap Callout
        else if (trimmed.toLowerCase().includes('examiner trap') || trimmed.toLowerCase().includes('warning') || trimmed.toLowerCase().includes('misconception')) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          const cleanCallout = trimmed.replace(/\*\*/g, '');
          const splitCallout = doc.splitTextToSize(cleanCallout, contentWidth - 24);
          const cHeight = splitCallout.length * 13 + 12;

          checkPageBreak(cHeight + 8);
          doc.setFillColor(254, 242, 242);
          doc.setDrawColor(254, 202, 202);
          doc.roundedRect(margin + 5, cursorY, contentWidth - 10, cHeight, 4, 4, 'FD');

          doc.setTextColor(185, 28, 28);
          doc.text(splitCallout, margin + 12, cursorY + 14);
          cursorY += cHeight + 8;
        }
        // Bullet Point
        else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const bulletContent = trimmed.replace(/^[-*•]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const splitBullet = doc.splitTextToSize(bulletContent, contentWidth - 22);
          const bHeight = splitBullet.length * 12.5;

          checkPageBreak(bHeight + 4);
          doc.setFillColor(74, 222, 128);
          doc.circle(margin + 8, cursorY + 5, 2, 'F');

          doc.setTextColor(30, 41, 59);
          doc.text(splitBullet, margin + 16, cursorY + 8);
          cursorY += bHeight + 4;
        }
        // Standard Paragraph / Explanation
        else {
          const cleanPara = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const splitPara = doc.splitTextToSize(cleanPara, contentWidth - 10);
          const pHeight = splitPara.length * 12.5;

          checkPageBreak(pHeight + 4);
          doc.setTextColor(51, 65, 85);
          doc.text(splitPara, margin + 5, cursorY + 8);
          cursorY += pHeight + 4;
        }
      }

      cursorY += 14;

      // Section Divider between Q&A pairs
      if (idx < messages.length - 1) {
        checkPageBreak(15);
        doc.setDrawColor(235, 238, 242);
        doc.setLineWidth(0.75);
        doc.line(margin + 10, cursorY, pageWidth - margin - 10, cursorY);
        cursorY += 16;
      }
    }
  }

  // Add Page Numbers and Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.6);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    doc.setTextColor(140, 140, 150);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Examix AI • Socratic Learning Companion', margin, pageHeight - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
  }

  doc.save(`${cleanTitle}_Study_Notes.pdf`);
}
