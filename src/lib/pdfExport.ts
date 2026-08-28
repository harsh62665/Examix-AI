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

/**
 * Normalizes and cleans LaTeX mathematical equations and symbols into high-legibility text for PDF printing.
 */
export function cleanLatexForPdf(text: string): string {
  if (!text) return '';

  let res = text;

  // Fractions: \frac{num}{den} -> (num) / (den)
  res = res.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1) / ($2)');
  // Nested fraction safety pass
  res = res.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1) / ($2)');

  // Common physics/math symbols
  res = res.replace(/\\times/g, '×');
  res = res.replace(/\\cdot/g, '·');
  res = res.replace(/\\pm/g, '±');
  res = res.replace(/\\approx/g, '≈');
  res = res.replace(/\\neq/g, '≠');
  res = res.replace(/\\le(?:q)?/g, '≤');
  res = res.replace(/\\ge(?:q)?/g, '≥');
  res = res.replace(/\\rightarrow/g, '→');
  res = res.replace(/\\leftarrow/g, '←');
  res = res.replace(/\\infty/g, '∞');
  res = res.replace(/\\Delta/g, 'Δ');
  res = res.replace(/\\pi/g, 'π');
  res = res.replace(/\\varepsilon_0/g, 'ε₀');
  res = res.replace(/\\varepsilon_r/g, 'ε_r');
  res = res.replace(/\\varepsilon/g, 'ε');
  res = res.replace(/\\theta/g, 'θ');
  res = res.replace(/\\lambda/g, 'λ');
  res = res.replace(/\\mu/g, 'μ');
  res = res.replace(/\\alpha/g, 'α');
  res = res.replace(/\\beta/g, 'β');
  res = res.replace(/\\gamma/g, 'γ');
  res = res.replace(/\\sigma/g, 'σ');
  res = res.replace(/\\omega/g, 'ω');
  res = res.replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)');

  // Vectors & Unit vectors: \vec{F}_{21} -> F₂₁ (vec), \hat{r}_{12} -> r̂₁₂
  res = res.replace(/\\vec\s*\{([^{}]+)\}_\{([^{}]+)\}/g, '$1_$2 (vector)');
  res = res.replace(/\\vec\s*\{([^{}]+)\}/g, '$1 (vector)');
  res = res.replace(/\\hat\s*\{([^{}]+)\}_\{([^{}]+)\}/g, '$1̂_$2');
  res = res.replace(/\\hat\s*\{([^{}]+)\}/g, '$1̂');

  // Text inside LaTeX: \text{...} -> ...
  res = res.replace(/\\text\s*\{([^{}]+)\}/g, '$1');
  res = res.replace(/\\mathrm\s*\{([^{}]+)\}/g, '$1');
  res = res.replace(/\\mathbf\s*\{([^{}]+)\}/g, '$1');

  // Subscripts & Superscripts
  res = res.replace(/\^\{(-?\d+)\}/g, '^$1');
  res = res.replace(/_\{([^{}]+)\}/g, '_$1');

  // Clean remaining LaTeX slash commands and dollar delimiters
  res = res.replace(/\\\s+/g, ' ');
  res = res.replace(/\$\$/g, '');
  res = res.replace(/\$/g, '');

  return res.trim();
}

/**
 * Strips internal system instructions, JSON sync blocks, and next steps tags from assistant content.
 */
export function cleanAssistantContent(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText.normalize('NFKD');

  // 1. Remove JSON sync blocks
  cleaned = cleaned.replace(/```json\s*\{[\s\S]*?"system_sync"[\s\S]*?\}\s*```/gi, '');

  // 2. Remove [NEXT_STEPS] blocks
  cleaned = cleaned.replace(/\[NEXT_STEPS\][\s\S]*?\[\/NEXT_STEPS\]/gi, '');

  // 3. Remove SVG elements or replace with a clean note
  cleaned = cleaned.replace(/```(?:xml|svg)?\s*<svg[\s\S]*?<\/svg>\s*```/gi, '');
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // 4. Remove [VIDEO_SCENE] or [WHITEBOARD] blocks
  cleaned = cleaned.replace(/\[VIDEO_SCENE:[\s\S]*?\]/gi, '');
  cleaned = cleaned.replace(/\[VIDEO_SCENE\][\s\S]*?\[\/VIDEO_SCENE\]/gi, '');
  cleaned = cleaned.replace(/\[WHITEBOARD_SEQUENCE\][\s\S]*?\[\/WHITEBOARD_SEQUENCE\]/gi, '');

  // 5. Remove any leftover internal tags
  cleaned = cleaned.replace(/\[Visual Explainer Diagram:[^\]]*\]/gi, '');

  return cleaned.trim();
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

  // Determine if there is a primary revision sheet topic
  let topicTitle = session?.title || 'Exam Quick Revision Sheet';
  for (const m of messages) {
    if (m.role === 'assistant' && m.content) {
      const topicMatch = /# 📌\s*([^\n—–-]+)(?:—|–|-)?\s*Exam Quick Revision Sheet/i.exec(m.content);
      if (topicMatch) {
        topicTitle = topicMatch[1].trim();
        break;
      }
    }
  }

  const cleanTitle = topicTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'Examix_Revision_Notes';
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
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.roundedRect(margin, cursorY, contentWidth, 72, 6, 6, 'F');

      // Emerald Accent Bar
      doc.setFillColor(74, 222, 128); // #4ADE80
      doc.rect(margin, cursorY, 6, 72, 'F');

      doc.setTextColor(74, 222, 128);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('EXAMIX AI  •  EXAM QUICK REVISION SHEET', margin + 18, cursorY + 22);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const truncatedTitle = topicTitle.length > 45 ? topicTitle.substring(0, 42) + '...' : topicTitle;
      doc.text(truncatedTitle, margin + 18, cursorY + 44);

      doc.setTextColor(148, 163, 184); // Slate 400
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Target: 100/100 Board & Competitive Exams  |  Generated: ${formattedDate}`, margin + 18, cursorY + 60);

      cursorY += 88;
    } else {
      // Running top header for subsequent pages
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.line(margin, 28, pageWidth - margin, 28);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('EXAMIX AI — EXAM QUICK REVISION SHEET', margin, 20);

      const titleShort = topicTitle.length > 35 ? topicTitle.substring(0, 32) + '...' : topicTitle;
      doc.text(titleShort, pageWidth - margin, 20, { align: 'right' });
    }
  };

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - margin - 25) {
      doc.addPage();
      cursorY = 45;
      addHeader(false);
    }
  };

  // Draw Page 1 header
  addHeader(true);

  // Process messages
  for (let idx = 0; idx < messages.length; idx++) {
    const msg = messages[idx];
    const isUser = msg.role === 'user';

    if (isUser) {
      const cleanUserText = msg.content || '(Uploaded query/files for examination)';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitUserLines = doc.splitTextToSize(cleanUserText, contentWidth - 28);
      const boxHeight = Math.max(34, splitUserLines.length * 12 + 20);

      checkPageBreak(boxHeight + 10);

      // Light slate question container
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 4, 4, 'FD');

      // Left blue tag bar
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(margin, cursorY, 3.5, boxHeight, 2, 2, 'F');

      // Badge
      doc.setTextColor(30, 64, 175);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`STUDENT QUERY #${Math.floor(idx / 2) + 1}`, margin + 12, cursorY + 12);

      // Prompt text
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(splitUserLines, margin + 12, cursorY + 24);

      cursorY += boxHeight + 12;
    } else {
      const rawContent = msg.content || '';
      const cleanedText = cleanAssistantContent(rawContent);

      if (!cleanedText) continue;

      const lines = cleanedText.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          cursorY += 4;
          continue;
        }

        // Section Title: # 📌 ... or # ...
        if (line.startsWith('# 📌') || line.startsWith('# ')) {
          const title = cleanLatexForPdf(line.replace(/^#\s*(?:📌)?\s*/, ''));
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          const splitTitle = doc.splitTextToSize(title, contentWidth - 10);
          const tHeight = splitTitle.length * 16 + 6;

          checkPageBreak(tHeight + 8);
          doc.setTextColor(15, 23, 42);
          doc.text(splitTitle, margin, cursorY + 14);
          cursorY += tHeight + 6;
        }
        // Sub-header Metadata: **Subject / Level:** ...
        else if (line.startsWith('**Subject / Level:**') || line.startsWith('**Subject:**')) {
          const metaText = line.replace(/\*\*/g, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          const splitMeta = doc.splitTextToSize(metaText, contentWidth - 10);
          const mHeight = splitMeta.length * 12 + 4;

          checkPageBreak(mHeight + 4);
          doc.setTextColor(100, 116, 139);
          doc.text(splitMeta, margin, cursorY + 8);
          cursorY += mHeight + 4;

          // Horizontal Divider
          checkPageBreak(10);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.75);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 10;
        }
        // Section 1: Core Definition & Standard Statement (### 1. ...)
        else if (line.startsWith('### 1.') || line.includes('Core Definition')) {
          const heading = line.replace(/^###\s*/, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);

          checkPageBreak(30);
          // Purple/Indigo Accent Card Header
          doc.setFillColor(245, 243, 255); // Indigo 50
          doc.setDrawColor(199, 210, 254);
          doc.roundedRect(margin, cursorY, contentWidth, 22, 4, 4, 'FD');

          doc.setFillColor(99, 102, 241); // Indigo 500
          doc.roundedRect(margin, cursorY, 4, 22, 2, 2, 'F');

          doc.setTextColor(67, 56, 202);
          doc.text(heading, margin + 12, cursorY + 15);
          cursorY += 28;
        }
        // Section 2: Mathematical Formula & Units (### 2. ...)
        else if (line.startsWith('### 2.') || line.includes('Mathematical Formula')) {
          const heading = line.replace(/^###\s*/, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);

          checkPageBreak(30);
          // Blue Accent Card Header
          doc.setFillColor(239, 246, 255); // Blue 50
          doc.setDrawColor(191, 219, 254);
          doc.roundedRect(margin, cursorY, contentWidth, 22, 4, 4, 'FD');

          doc.setFillColor(37, 99, 235); // Blue 600
          doc.roundedRect(margin, cursorY, 4, 22, 2, 2, 'F');

          doc.setTextColor(30, 64, 175);
          doc.text(heading, margin + 12, cursorY + 15);
          cursorY += 28;
        }
        // Section 3: Exam Traps & Common Student Mistakes (### 3. ...)
        else if (line.startsWith('### 3.') || line.includes('Exam Traps')) {
          const heading = line.replace(/^###\s*/, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);

          checkPageBreak(30);
          // Red Alert Card Header
          doc.setFillColor(254, 242, 242); // Red 50
          doc.setDrawColor(254, 202, 202);
          doc.roundedRect(margin, cursorY, contentWidth, 22, 4, 4, 'FD');

          doc.setFillColor(239, 68, 68); // Red 500
          doc.roundedRect(margin, cursorY, 4, 22, 2, 2, 'F');

          doc.setTextColor(185, 28, 28);
          doc.text(heading, margin + 12, cursorY + 15);
          cursorY += 28;
        }
        // Section 4: Quick Memory Lock & Proportionality Rules (### 4. ...)
        else if (line.startsWith('### 4.') || line.includes('Quick Memory Lock')) {
          const heading = line.replace(/^###\s*/, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);

          checkPageBreak(30);
          // Amber/Gold Card Header
          doc.setFillColor(254, 252, 232); // Yellow 50
          doc.setDrawColor(254, 240, 138);
          doc.roundedRect(margin, cursorY, contentWidth, 22, 4, 4, 'FD');

          doc.setFillColor(234, 179, 8); // Amber 500
          doc.roundedRect(margin, cursorY, 4, 22, 2, 2, 'F');

          doc.setTextColor(161, 98, 7);
          doc.text(heading, margin + 12, cursorY + 15);
          cursorY += 28;
        }
        // Section 5: Active Verification & Practice Problem (### 5. ...)
        else if (line.startsWith('### 5.') || line.includes('Active Verification') || line.includes('Practice Problem')) {
          const heading = line.replace(/^###\s*/, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);

          checkPageBreak(30);
          // Emerald Card Header
          doc.setFillColor(240, 253, 244); // Green 50
          doc.setDrawColor(187, 247, 208);
          doc.roundedRect(margin, cursorY, contentWidth, 22, 4, 4, 'FD');

          doc.setFillColor(34, 197, 94); // Green 500
          doc.roundedRect(margin, cursorY, 4, 22, 2, 2, 'F');

          doc.setTextColor(22, 101, 52);
          doc.text(heading, margin + 12, cursorY + 15);
          cursorY += 28;
        }
        // Generic Headings (### or ##)
        else if (line.startsWith('###') || line.startsWith('##')) {
          const heading = line.replace(/^#+\s*/, '');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          const splitH = doc.splitTextToSize(heading, contentWidth - 10);
          const hHeight = splitH.length * 14 + 4;

          checkPageBreak(hHeight + 6);
          doc.setTextColor(15, 23, 42);
          doc.text(splitH, margin + 2, cursorY + 10);
          cursorY += hHeight + 6;
        }
        // Standalone LaTeX Block Equation: $$ ... $$
        else if (line.startsWith('$$') || (line.startsWith('\\[') && line.endsWith('\\]'))) {
          const mathExpr = cleanLatexForPdf(line);
          doc.setFont('courier', 'bold');
          doc.setFontSize(10);
          const splitMath = doc.splitTextToSize(mathExpr, contentWidth - 30);
          const mBoxHeight = splitMath.length * 13 + 14;

          checkPageBreak(mBoxHeight + 8);
          doc.setFillColor(241, 245, 249); // Slate 100
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(margin, cursorY, contentWidth, mBoxHeight, 4, 4, 'FD');

          doc.setTextColor(15, 23, 42);
          doc.text(splitMath, margin + 14, cursorY + 14);
          cursorY += mBoxHeight + 8;
        }
        // Divider line: ---
        else if (line === '---' || line === '***' || line === '___') {
          checkPageBreak(12);
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.75);
          doc.line(margin + 5, cursorY + 4, pageWidth - margin - 5, cursorY + 4);
          cursorY += 12;
        }
        // Bullet Points: * or - or •
        else if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ') || line.startsWith('  *') || line.startsWith('  -')) {
          const isNested = line.startsWith('  *') || line.startsWith('  -');
          const cleanBullet = cleanLatexForPdf(line.replace(/^\s*[-*•]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1'));
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const leftIndent = isNested ? margin + 24 : margin + 14;
          const textWidth = contentWidth - (isNested ? 30 : 20);
          const splitBullet = doc.splitTextToSize(cleanBullet, textWidth);
          const bHeight = splitBullet.length * 12.5;

          checkPageBreak(bHeight + 4);

          // Dot indicator
          doc.setFillColor(isNested ? 148 : 74, isNested ? 163 : 222, isNested ? 184 : 128);
          doc.circle(leftIndent - 6, cursorY + 5, isNested ? 1.5 : 2, 'F');

          doc.setTextColor(30, 41, 59);
          doc.text(splitBullet, leftIndent, cursorY + 8);
          cursorY += bHeight + 4;
        }
        // Numbered List: 1. or 2.
        else if (/^\d+\.\s/.test(line)) {
          const cleanNum = cleanLatexForPdf(line.replace(/\*\*(.*?)\*\*/g, '$1'));
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const splitNum = doc.splitTextToSize(cleanNum, contentWidth - 14);
          const nHeight = splitNum.length * 12.5;

          checkPageBreak(nHeight + 4);
          doc.setTextColor(30, 41, 59);
          doc.text(splitNum, margin + 8, cursorY + 8);
          cursorY += nHeight + 4;
        }
        // Standard Paragraph / Explanation
        else {
          const cleanPara = cleanLatexForPdf(line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'));
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          const splitPara = doc.splitTextToSize(cleanPara, contentWidth - 10);
          const pHeight = splitPara.length * 12.5;

          checkPageBreak(pHeight + 4);
          doc.setTextColor(51, 65, 85);
          doc.text(splitPara, margin + 4, cursorY + 8);
          cursorY += pHeight + 4;
        }
      }

      cursorY += 12;

      // Section Divider between messages if multiple
      if (idx < messages.length - 1) {
        checkPageBreak(15);
        doc.setDrawColor(226, 232, 240);
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
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Examix AI • Socratic Revision & Exam Sheet Engine', margin, pageHeight - 12);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
  }

  doc.save(`${cleanTitle}_Exam_Sheet.pdf`);
}

