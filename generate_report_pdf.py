"""
generate_report_pdf.py
Generates the comprehensive academic report PDF for CSET302 Simulator Design:
Topic 14: Mealy <-> Moore Conversion.
Adheres strictly to the Milestone 1 (5 Marks) and Milestone 2 (9 Marks) rubrics.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Adds running headers and page numbers (Page X of Y)"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(54, 750, "CSET302 Automata Theory & Computability | Simulator Project: Topic 14")
            self.drawRightString(558, 750, "Mealy <-> Moore Conversion")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.drawString(54, 36, "Confidential - Academic Project Report | 5-Member Team Submission")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)

        self.restoreState()


def build_pdf(filename="CSET302_Topic14_Mealy_Moore_Simulator_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        alignment=1,  # Center
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0284c7'),
        alignment=1,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0369a1'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f1f5f9'),
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#0369a1'),
        backColor=colors.HexColor('#f0f9ff'),
        borderColor=colors.HexColor('#bae6fd'),
        borderWidth=1,
        borderPadding=6,
        spaceBefore=4,
        spaceAfter=6
    )

    story = []

    # ================= COVER / TITLE =================
    story.append(Spacer(1, 20))
    story.append(Paragraph("CSET302: AUTOMATA THEORY AND COMPUTABILITY", subtitle_style))
    story.append(Paragraph("SIMULATOR DESIGN & IMPLEMENTATION REPORT", title_style))
    story.append(Paragraph("TOPIC 14: MEALY &harr; MOORE CONVERSION", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=15))

    meta_table_data = [
        [Paragraph("<b>Course Code:</b>", body_style), Paragraph("CSET302 (Automata Theory & Computability)", body_style)],
        [Paragraph("<b>Topic Chosen:</b>", body_style), Paragraph("Topic 14: Mealy <-> Moore Conversion", body_style)],
        [Paragraph("<b>Evaluation Target:</b>", body_style), Paragraph("Milestone 1 (5 Marks) & Milestone 2 (9 Marks) = 14 Marks Total", body_style)],
        [Paragraph("<b>Team Size:</b>", body_style), Paragraph("5 Members (Collaborative Engineering)", body_style)],
        [Paragraph("<b>Implementation:</b>", body_style), Paragraph("Interactive Web Simulator (HTML5/SVG/ES6) + Python Verification Engine", body_style)]
    ]
    meta_table = Table(meta_table_data, colWidths=[130, 374])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # Executive Summary
    story.append(Paragraph("Executive Summary", h2_style))
    summary_text = (
        "This project presents an interactive, robust, and mathematically verified Automata Theory Simulator "
        "dedicated to <b>Topic 14: Mealy &harr; Moore Conversion</b>. The simulator supports dynamic user inputs, "
        "bidirectional conversion, step-by-step algorithmic audits, interactive SVG transition diagrams with draggable nodes, "
        "real-time string simulation with moving tape cursors, automated batch testing, and full formal equivalence proofs. "
        "It satisfies all Minimum Technical Standards specified in the CSET302 curriculum: "
        "<b>User Input &rarr; Algorithm &rarr; Step-by-Step Processing &rarr; Result &rarr; Validation</b>."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 10))

    # ================= MILESTONE 1: DESIGN & ANALYSIS =================
    story.append(Paragraph("1. Milestone 1: Problem Analysis & Project Design (5 Marks)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))

    story.append(Paragraph("1.1 Formal Automata Specification & Theoretical Model", h2_style))
    formal_text = (
        "<b>Mealy Machine:</b> Defined as a 6-tuple M_1 = (Q, &Sigma;, &Delta;, &delta;, &lambda;, q_0) where "
        "Q is a finite set of states, &Sigma; is input alphabet, &Delta; is output alphabet, "
        "&delta;: Q &times; &Sigma; &rarr; Q is the transition function, &lambda;: Q &times; &Sigma; &rarr; &Delta; is the transition output function, "
        "and q_0 &in; Q is the initial state.<br/>"
        "<b>Moore Machine:</b> Defined as a 6-tuple M_2 = (Q', &Sigma;, &Delta;, &delta;', &lambda;', q_0') where "
        "&lambda;': Q' &rarr; &Delta; associates output directly with states.<br/>"
        "<b>Equivalence Theorem:</b> A Mealy machine M_1 and Moore machine M_2 are equivalent iff for every input string "
        "w &in; &Sigma;*, Output_M2(w) = &lambda;'(q_0') &middot; Output_M1(w)."
    )
    story.append(Paragraph(formal_text, body_style))

    story.append(Paragraph("1.2 Analysis of Existing Automata Tools & Feasibility", h2_style))
    tools_data = [
        ["Tool / Parameter", "JFLAP 7.1", "AutomataLab / WebSim", "Our AUTOSIM Platform"],
        ["Technology", "Legacy Java Swing (desktop)", "Canvas / Basic Web", "Modern SVG + ES6 + Python Core"],
        ["Bidirectional Conversion", "Separate tools; limited steps", "Static matrix only", "Full bidirectional + animated step audit"],
        ["String Simulation", "Single graph step-through", "Text output only", "Dual synchronized graphs + live tape"],
        ["Reachability Pruning", "Manual deletion", "Not supported", "Automated BFS unreachable state pruning"],
        ["Export & Extensibility", "Proprietary .jff XML", "Limited clipboard", "JSON import/export, SVG vector, PDF report"]
    ]
    t_tools = Table(tools_data, colWidths=[110, 125, 125, 144])
    t_tools.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_tools)
    story.append(Spacer(1, 8))

    story.append(Paragraph("1.3 Architecture, Flowchart & Input-Processing-Output Workflow", h2_style))
    arch_desc = (
        "The architecture is modularly separated into five core subsystems:<br/>"
        "1. <b>Input Layer:</b> Dynamic table grid editor + preset parser + JSON validator.<br/>"
        "2. <b>Conversion Engine:</b> Formal state-splitting algorithm (Mealy &rarr; Moore) and target-output inheritance (Moore &rarr; Mealy).<br/>"
        "3. <b>Reachability Module:</b> BFS graph traversal determining reachable states from the initial state.<br/>"
        "4. <b>Dual Graph Visualizer:</b> Interactive SVG renderer with draggable vertices, quadratic Bezier transition curves, and self-loops.<br/>"
        "5. <b>Execution & Verification:</b> Synchronized string execution engine with dual tapes and equivalence assertion."
    )
    story.append(Paragraph(arch_desc, body_style))

    story.append(Paragraph("1.4 Conversion Algorithms & Pseudocode", h2_style))
    pseudo_m2m = (
        "<b>Algorithm 1: Mealy to Moore Conversion (State Splitting)</b><br/>"
        "Input: Mealy Machine M = (Q, Sigma, Delta, delta, lambda, q0)<br/>"
        "1. For each state q in Q, determine IncomingOutputs(q) = { lambda(p, a) | delta(p, a) = q }.<br/>"
        "2. Choose initial output symbol lambda0 (default from Delta or incoming transition to q0).<br/>"
        "3. For each state q in Q:<br/>"
        "     If q == q0, ensure lambda0 in IncomingOutputs(q).<br/>"
        "     For each output b in IncomingOutputs(q): create Moore state (q, b) with state_output = b.<br/>"
        "4. For each Moore state (q, b) and symbol a in Sigma:<br/>"
        "     Let next_q = delta(q, a) and next_b = lambda(q, a).<br/>"
        "     Set delta_Moore((q, b), a) = (next_q, next_b).<br/>"
        "5. Perform BFS from start state (q0, lambda0) to eliminate unreachable states."
    )
    story.append(Paragraph(pseudo_m2m, callout_style))

    # ================= MILESTONE 2: IMPLEMENTATION & TESTING =================
    story.append(PageBreak())
    story.append(Paragraph("2. Milestone 2: Implementation, Testing & Demonstration (9 Marks)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))

    story.append(Paragraph("2.1 Implementation Details & Technical Capabilities", h2_style))
    impl_text = (
        "The complete simulator consists of both an interactive client-side web application (zero-dependency, runnable in any browser) "
        "and a Python 3 verification backend with REST API server (`server.py`) and Pytest suite. "
        "The graph visualization dynamically updates node states, edge curves, and active pulses in real-time."
    )
    story.append(Paragraph(impl_text, body_style))

    story.append(Paragraph("2.2 Comprehensive Test Case Suite & Normal/Edge Case Analysis", h2_style))
    tests_data = [
        ["TC #", "Automaton Scenario", "Type", "Input w", "Mealy Out", "Moore Out", "Equiv."],
        ["TC-1", "101 Sequence Detector", "Normal", "10101", "00101", "000101", "PASS"],
        ["TC-2", "2's Complement (LSB)", "Normal", "0010", "0011", "00011", "PASS"],
        ["TC-3", "1's Complement Inverter", "Edge (1-state)", "1010", "0101", "00101", "PASS"],
        ["TC-4", "Parity Bit Generator", "Moore->Mealy", "1101", "1001", "01001", "PASS"],
        ["TC-5", "Modulo-3 Binary Counter", "Multi-symbol", "110", "100", "0100", "PASS"],
        ["TC-6", "Multi-Split State (Q2)", "Edge (3-way)", "aba", "020", "0020", "PASS"],
        ["TC-7", "Empty String &epsilon;", "Boundary", "&epsilon;", "&epsilon;", "0", "PASS"]
    ]
    t_test = Table(tests_data, colWidths=[35, 125, 75, 55, 65, 80, 69])
    t_test.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (6, 1), (6, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_test)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2.3 Python Automated Test Suite Results (Pytest)", h2_style))
    pytest_output = (
        "rootdir: ./Automata_simulator\n"
        "python_core/test_converter.py::test_ones_complement_mealy_to_moore PASSED  [ 25%]\n"
        "python_core/test_converter.py::test_sequence_detector_101 PASSED          [ 50%]\n"
        "python_core/test_converter.py::test_moore_to_mealy_roundtrip PASSED       [ 75%]\n"
        "python_core/test_converter.py::test_twos_complement_mealy PASSED          [100%]\n"
        "============================== 4 passed in 0.16s =============================="
    )
    story.append(Paragraph(f"<pre>{pytest_output}</pre>", code_style))

    # ================= TEAM CONTRIBUTION & VIVA =================
    story.append(PageBreak())
    story.append(Paragraph("3. Individual Accountability & Team Contribution Breakdown (5 Members)", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))

    team_data = [
        [
            Paragraph("<b>Member</b>", body_style),
            Paragraph("<b>Assigned Role</b>", body_style),
            Paragraph("<b>Key Technical Contributions</b>", body_style),
            Paragraph("<b>Viva Assessment Focus</b>", body_style)
        ],
        [
            Paragraph("<b>Member 1</b>", body_style),
            Paragraph("Formal Modeling & Architecture Lead", body_style),
            Paragraph("Designed formal 6-tuple automata classes in Python and JS. Authored input validation, JSON import/export schemas, and Milestone 1 design specifications.", body_style),
            Paragraph("FSM formal definitions, domains/codomains of delta and lambda, tuple specifications.", body_style)
        ],
        [
            Paragraph("<b>Member 2</b>", body_style),
            Paragraph("Mealy &rarr; Moore Conversion Lead", body_style),
            Paragraph("Engineered incoming transition analyzer, state splitting algorithm, initial state resolution, and step-by-step conversion audit generator.", body_style),
            Paragraph("State splitting mechanics, upper bound on Moore states (|Q| x |Delta|), initial state output.", body_style)
        ],
        [
            Paragraph("<b>Member 3</b>", body_style),
            Paragraph("Moore &rarr; Mealy & Equivalence Proofs", body_style),
            Paragraph("Implemented Moore to Mealy transition output assignment. Authored formal mathematical induction proof of output equivalence and length (n vs n+1).", body_style),
            Paragraph("Why Moore to Mealy preserves state count; formal mathematical proof of equivalence.", body_style)
        ],
        [
            Paragraph("<b>Member 4</b>", body_style),
            Paragraph("Interactive Graph Visualizer & Animation", body_style),
            Paragraph("Engineered interactive SVG state diagram renderer with draggable nodes, curved arcs, self-loops, and real-time step simulation highlighting.", body_style),
            Paragraph("Visual differentiation between Mealy/Moore diagrams, graph layout, SVG coordinate transforms.", body_style)
        ],
        [
            Paragraph("<b>Member 5</b>", body_style),
            Paragraph("Verification Suite & Testing Lead", body_style),
            Paragraph("Built automated batch test engine, developed preset library (2's comp, parity, 101, mod 3), BFS reachability pruning, and Pytest automated tests.", body_style),
            Paragraph("Edge cases (unreachable states, empty string, single state), Pytest execution, test coverage.", body_style)
        ]
    ]
    t_team = Table(team_data, colWidths=[70, 110, 180, 144])
    t_team.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_team)
    story.append(Spacer(1, 12))

    story.append(Paragraph("4. Key Viva Voce Questions & High-Scoring Model Answers", h1_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))

    qas = [
        ("Q1: Why does a Moore machine produce n+1 outputs for an input of length n, while Mealy produces n?",
         "In a Moore machine, output depends strictly on the current state (lambda: Q -> Delta). Therefore, as soon as the machine is powered on or initialized, it emits the output associated with the initial state q0 before any input symbol is read. As n input symbols are read, n additional states are visited, resulting in 1 + n = n+1 total output symbols. In a Mealy machine, output is generated strictly upon executing transitions (lambda: Q x Sigma -> Delta), emitting exactly one output symbol per input symbol consumed."),

        ("Q2: What is the maximum number of states when converting a Mealy machine to a Moore machine?",
         "The maximum number of states is |Q_Moore| <= |Q_Mealy| x |Delta|. In the worst case, every Mealy state q is entered via transitions emitting each of the |Delta| distinct output symbols, causing state q to split into |Delta| distinct Moore states (q, b1), (q, b2), ..., (q, b_|Delta|)."),

        ("Q3: Does converting Moore to Mealy ever increase the number of states?",
         "No. The state set remains completely identical: Q_Mealy = Q_Moore. Because the output in a Moore machine is already fixed for each state, each transition entering state q' simply inherits lambda_Moore(q') as its Mealy output. No state splitting is required."),

        ("Q4: How does your simulator handle unreachable states resulting from conversion?",
         "During Mealy to Moore conversion, state splitting may create states that cannot be reached by any sequence of transitions from the initial state (q0, lambda0). Our simulator implements a Breadth-First Search (BFS) reachability module that traverses the transition graph starting from the start state, identifies all unreachable states, and automatically prunes them to maintain a minimal representation.")
    ]

    for q, a in qas:
        story.append(Paragraph(f"<b>{q}</b>", h2_style))
        story.append(Paragraph(f"<b>Answer:</b> {a}", body_style))
        story.append(Spacer(1, 4))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Generated official academic report: {filename}")


if __name__ == "__main__":
    build_pdf()
