import { useEffect, useRef, useState } from "react";
import { BsArrowUp, BsMic, BsPlusLg } from "react-icons/bs";
import "./LegalAssistant.css";
import {
  queryLegalAssistant,
  queryLegalAssistantStream,
} from "../../services/legalApi";

const SUGGESTIONS = [
  "Police refused to register FIR",
  "Landlord threatening illegal eviction",
  "Domestic violence immediate help",
  "Cyber fraud money lost",
];

const LEGAL_KNOWLEDGE = [
  {
    keys: ["fir", "police", "complaint", "refused"],
    now: "Write a brief complaint and insist on FIR registration for cognizable offences.",
    next24h: "Escalate to SP/Commissioner in writing and keep acknowledgement proof.",
    docs: "ID proof, incident timeline, photos/videos, witness contacts, prior complaint copy.",
    fileAt: "Nearest Police Station; escalation to SP/Commissioner office if FIR is refused.",
  },
  {
    keys: ["legal aid", "free lawyer", "nalsa", "dlsa"],
    now: "Apply at DLSA/legal services clinic for a free lawyer if eligible.",
    next24h: "Attend first consultation and follow filing deadlines shared by assigned counsel.",
    docs: "ID/address proof, income certificate (if asked), case papers, notices/summons.",
    fileAt: "District Legal Services Authority (DLSA) office in your district court complex.",
  },
  {
    keys: ["domestic violence", "abuse", "protection", "harassment"],
    now: "If unsafe, call emergency police and seek immediate protection support.",
    next24h: "File a Domestic Violence complaint for protection, residence, and maintenance relief.",
    docs: "Medical records, injury photos, threatening messages, marriage proof, expense details.",
    fileAt: "Protection Officer / Magistrate Court; Police Station for immediate threat.",
  },
  {
    keys: ["tenant", "rent", "landlord", "eviction", "deposit"],
    now: "Do not vacate without written notice/legal order if eviction seems illegal.",
    next24h: "Send a written reply and approach rent authority or civil court if required.",
    docs: "Rent agreement, payment receipts, notice copy, chat/email records, utility bills.",
    fileAt: "Rent Controller authority or local Civil Court (city-specific).",
  },
  {
    keys: ["divorce", "custody", "maintenance", "family"],
    now: "Collect financial and relationship records before filing any family case.",
    next24h: "Consider mediation first, then file for custody/maintenance/divorce as appropriate.",
    docs: "Marriage proof, child documents, income proofs, bank statements, communication records.",
    fileAt: "Family Court in your district.",
  },
  {
    keys: ["cyber", "fraud", "online scam", "upi", "bank"],
    now: "Immediately report to 1930 and your bank to attempt fund hold/reversal.",
    next24h: "File complaint on cybercrime portal and follow up with FIR if needed.",
    docs: "Transaction IDs, account details, screenshots, call logs, complaint reference number.",
    fileAt: "cybercrime.gov.in and nearest Cyber Police Station.",
  },
];

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 1_500_000;
const MAX_ATTACHMENT_TEXT_CHARS = 12_000;
const TEXT_FILE_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "xml",
  "html",
  "htm",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "log",
  "ini",
  "yaml",
  "yml",
]);

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (bytes <= 0) return "0 KB";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

function isTextLikeFile(file) {
  const mime = String(file?.type || "").toLowerCase();
  if (mime.startsWith("text/")) return true;
  if (
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("csv") ||
    mime.includes("javascript")
  ) {
    return true;
  }

  const extension = String(file?.name || "")
    .toLowerCase()
    .split(".")
    .pop();
  return TEXT_FILE_EXTENSIONS.has(extension);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file content."));
    reader.readAsDataURL(file);
  });
}

async function mapFileToAttachment(file, kind) {
  const base = {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    kind,
    payloadType: "metadata",
    note: "",
  };

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ...base,
      note: `Content skipped: file is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
    };
  }

  if (isTextLikeFile(file)) {
    try {
      const text = await file.text();
      const textContent = text.slice(0, MAX_ATTACHMENT_TEXT_CHARS);
      return {
        ...base,
        payloadType: "text",
        textContent,
        note:
          text.length > MAX_ATTACHMENT_TEXT_CHARS
            ? `Text trimmed to ${MAX_ATTACHMENT_TEXT_CHARS} characters.`
            : "",
      };
    } catch {
      return {
        ...base,
        note: "Content could not be read from this text file.",
      };
    }
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      ...base,
      payloadType: "data-url",
      dataUrl,
    };
  } catch {
    return {
      ...base,
      note: "Content could not be processed. Metadata only will be sent.",
    };
  }
}

function getEmergencyContactLine(cleanedQuery) {
  const q = cleanedQuery;

  if (
    q.includes("ambulance") ||
    q.includes("accident") ||
    q.includes("injury") ||
    q.includes("medical")
  ) {
    return "Emergency contact: Ambulance 102 / 108";
  }

  if (
    q.includes("fire") ||
    q.includes("burn") ||
    q.includes("smoke")
  ) {
    return "Emergency contact: Fire 101";
  }

  if (
    q.includes("domestic violence") ||
    q.includes("women") ||
    q.includes("sexual") ||
    q.includes("harassment")
  ) {
    return "Emergency contact: Women Helpline 181 / 1091 (and Police 112 if immediate danger)";
  }

  if (
    q.includes("child") ||
    q.includes("minor") ||
    q.includes("child abuse")
  ) {
    return "Emergency contact: Child Helpline 1098";
  }

  if (
    q.includes("cyber") ||
    q.includes("upi") ||
    q.includes("online scam") ||
    q.includes("fraud")
  ) {
    return "Emergency contact: Cyber Fraud Helpline 1930";
  }

  if (
    q.includes("police") ||
    q.includes("fir") ||
    q.includes("theft") ||
    q.includes("threat") ||
    q.includes("violence")
  ) {
    return "Emergency contact: Police 100 / 112";
  }

  if (
    q.includes("emergency") ||
    q.includes("sos") ||
    q.includes("helpline") ||
    q.includes("contact")
  ) {
    return "Emergency contact: 112 (all-in-one emergency number)";
  }

  return "";
}

function getLegalReply(query) {
  const cleaned = query.toLowerCase().trim();
  if (!cleaned) {
    return {
      now: "Type your issue in one line.",
      next24h: "Add city/state and urgency for a precise route.",
      docs: "Keep ID proof and incident timeline ready.",
      fileAt: "I will suggest exact filing authority after your issue.",
      emergencyLine: "",
    };
  }
  const emergencyLine = getEmergencyContactLine(cleaned);

  const hit = LEGAL_KNOWLEDGE.find((item) =>
    item.keys.some((key) => cleaned.includes(key))
  );

  if (hit) {
    return {
      now: hit.now,
      next24h: hit.next24h,
      docs: hit.docs,
      fileAt: hit.fileAt,
      emergencyLine,
    };
  }

  return {
    now: "Share issue type, city/state, and urgency in one line.",
    next24h: "I will suggest your exact legal route and filing order.",
    docs: "Keep ID proof, timeline, notices/messages, and payment proof ready.",
    fileAt: "Depends on your issue; I will map the right authority.",
    emergencyLine,
  };
}

function LegalAssistant() {
  const [isOpen, setIsOpen] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [instruction, setInstruction] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [composerNotice, setComposerNotice] = useState("");
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [answerSources, setAnswerSources] = useState([]);
  const [attachmentInsights, setAttachmentInsights] = useState([]);
  const [answerMode, setAnswerMode] = useState("local");
  const [answer, setAnswer] = useState(
    getLegalReply("")
  );
  const anyFileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const videoFileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const micStreamRef = useRef(null);
  const askSequenceRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("nyay-setu-assistant-open");
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("nyay-setu-assistant-open", String(isOpen));
  }, [isOpen]);

  useEffect(
    () => () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    },
    []
  );

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 200);
    };

    const onOpenRequest = (event) => {
      setIsOpen(true);
      const incomingQuery = event?.detail?.query?.trim();
      if (incomingQuery) {
        setQuery(incomingQuery);
        setAnswer(getLegalReply(incomingQuery));
        setHasAsked(true);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    window.addEventListener("open-legal-assistant", onOpenRequest);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("open-legal-assistant", onOpenRequest);
    };
  }, []);

  const handleAsk = async (text) => {
    const finalText = (typeof text === "string" ? text : query).trim();
    const instructionText = instruction.trim();
    const fileSummary = attachments.length
      ? ` Shared materials: ${attachments
          .map((item) => `${item.name} (${item.kind})`)
          .join(", ")}.`
      : "";

    const finalPrompt =
      `${finalText} ${instructionText ? `Instruction: ${instructionText}.` : ""}${fileSummary}`.trim();

    if (!finalPrompt) {
      setAnswer(getLegalReply(""));
      setAnswerSources([]);
      setAttachmentInsights([]);
      setAnswerMode("local");
      return;
    }

    const localReply = getLegalReply(finalPrompt);
    const askId = Date.now() + Math.random();
    askSequenceRef.current = askId;

    setQuery(finalText);
    setHasAsked(true);
    setShowAttachMenu(false);
    setIsLoadingAnswer(true);
    setComposerNotice("Starting live analysis...");
    setAnswer(localReply);
    setAttachmentInsights([]);

    try {
      const requestPayload = {
        query: finalText,
        instruction: instructionText,
        attachments: attachments.map((item) => ({
          name: item.name,
          kind: item.kind,
          type: item.type,
          size: item.size,
          payloadType: item.payloadType || "metadata",
          textContent: item.textContent || "",
          dataUrl: item.dataUrl || "",
          note: item.note || "",
        })),
      };
      let apiResponse = await queryLegalAssistantStream(requestPayload, {
        onEvent: (event) => {
          if (askSequenceRef.current !== askId) return;
          if (event?.type === "status" && event?.message) {
            setComposerNotice(String(event.message));
          }
        },
      });

      if (!apiResponse?.answer) {
        apiResponse = await queryLegalAssistant(requestPayload);
      }

      if (askSequenceRef.current !== askId) return;

      const remoteAnswer = apiResponse?.answer || {};
      setAnswer({
        ...localReply,
        ...remoteAnswer,
        emergencyLine: remoteAnswer.emergencyLine || localReply.emergencyLine,
      });
      setAnswerSources(
        Array.isArray(apiResponse?.sources) ? apiResponse.sources.slice(0, 4) : []
      );
      setAttachmentInsights(
        Array.isArray(apiResponse?.attachmentInsights)
          ? apiResponse.attachmentInsights.slice(0, 4)
          : []
      );
      setAnswerMode(apiResponse?.mode || "ai");
      setComposerNotice(
        apiResponse?.mode?.startsWith("fallback")
          ? "AI key missing or unavailable. Showing local guidance."
          : "Live response completed."
      );
    } catch {
      if (askSequenceRef.current !== askId) return;
      setAnswer(localReply);
      setAnswerSources([]);
      setAttachmentInsights([]);
      setAnswerMode("local");
      setComposerNotice("Live AI unavailable. Showing local legal guidance.");
    } finally {
      if (askSequenceRef.current === askId) {
        setIsLoadingAnswer(false);
      }
    }
  };

  const addFiles = async (files, kind) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;

    const availableSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    if (availableSlots <= 0) {
      setComposerNotice(`Attachment limit reached. Max ${MAX_ATTACHMENTS} files allowed.`);
      return;
    }

    const selectedFiles = picked.slice(0, availableSlots);
    const mapped = await Promise.all(selectedFiles.map((file) => mapFileToAttachment(file, kind)));
    const skippedCount = picked.length - selectedFiles.length;

    setAttachments((prev) => [...prev, ...mapped]);
    setComposerNotice(
      `${mapped.length} ${kind} file(s) attached.${
        skippedCount > 0 ? ` ${skippedCount} skipped due to limit.` : ""
      }`
    );
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const startMicRecording = async () => {
    if (isRecording) return;
    setComposerNotice("");

    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        setComposerNotice("Microphone recording is not supported on this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const voiceName = `voice-note-${Date.now()}.webm`;
        void addFiles([new File([blob], voiceName, { type: "audio/webm" })], "microphone");
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
          micStreamRef.current = null;
        }
      });

      recorder.start();
      setIsRecording(true);
      setComposerNotice("Recording from mic... click Stop to attach.");
    } catch {
      setComposerNotice("Microphone permission denied or unavailable.");
    }
  };

  const stopMicRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
    setIsRecording(false);
    setComposerNotice("Voice note attached.");
  };

  return (
    <>
      {!isOpen && hasScrolled && (
        <button
          className="legal-ai-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open legal assistant"
        >
          AI Legal Help
        </button>
      )}

      {isOpen && (
        <section className="legal-ai-popup">
          <div className="legal-ai-card">
            <div className="legal-ai-header">
              <h3>AI Legal Assistant</h3>
              <button
                className="legal-ai-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close legal assistant"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="legal-ai-body">
              {!hasAsked && (
                <>
                  <p className="legal-ai-subtitle">
                    Add files/media or just enter your situation. You can also use mic or camera.
                  </p>
                  <div className="legal-ai-suggestions">
                    {SUGGESTIONS.map((item) => (
                      <button key={item} type="button" onClick={() => handleAsk(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {hasAsked && (
                <div className="legal-ai-answer">
                  <p className="legal-ai-mode-tag">
                    {isLoadingAnswer ? "Thinking..." : `Answer mode: ${answerMode}`}
                  </p>
                  <p>
                    <strong>Do now:</strong> {answer.now}
                  </p>
                  <p>
                    <strong>Next 24 hours:</strong> {answer.next24h}
                  </p>
                  <p>
                    <strong>Documents needed:</strong> {answer.docs}
                  </p>
                  <p>
                    <strong>Where to file:</strong> {answer.fileAt}
                  </p>
                  {answer.emergencyLine && (
                    <p className="legal-ai-emergency">
                      <strong>Emergency:</strong> {answer.emergencyLine.replace(
                        "Emergency contact: ",
                        ""
                      )}
                    </p>
                  )}
                  {answerSources.length > 0 && (
                    <div className="legal-ai-sources">
                      <strong>Sources:</strong>
                      {answerSources.map((item) => (
                        <a
                          key={`${item.url}-${item.title}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.title || item.url}
                        </a>
                      ))}
                    </div>
                  )}
                  {attachmentInsights.length > 0 && (
                    <div className="legal-ai-sources">
                      <strong>File insights:</strong>
                      {attachmentInsights.map((item, index) => (
                        <p key={`${item}-${index}`}>{item}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="legal-ai-composer-wrap">
              {showAttachMenu && (
                <div className="legal-ai-attach-menu">
                  <button type="button" onClick={() => anyFileInputRef.current?.click()}>
                    File
                  </button>
                  <button type="button" onClick={() => audioFileInputRef.current?.click()}>
                    Audio
                  </button>
                  <button type="button" onClick={() => videoFileInputRef.current?.click()}>
                    Video
                  </button>
                  <button type="button" onClick={() => cameraInputRef.current?.click()}>
                    Camera
                  </button>
                  <button type="button" onClick={() => setShowInstruction((prev) => !prev)}>
                    Instruction
                  </button>
                </div>
              )}

              {showInstruction && (
                <textarea
                  className="legal-ai-instruction"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Optional instruction..."
                  rows={2}
                />
              )}

              {attachments.length > 0 && (
                <div className="legal-ai-attachments">
                  {attachments.map((item) => (
                    <div key={item.id} className="legal-ai-attachment-chip">
                      <span>{item.name}</span>
                      {item.note && <small>{item.note}</small>}
                      <button type="button" onClick={() => removeAttachment(item.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {composerNotice && <p className="legal-ai-notice">{composerNotice}</p>}

              <form
                className="legal-ai-chatbar"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAsk();
                }}
              >
                <button
                  type="button"
                  className="legal-ai-chat-icon"
                  onClick={() => setShowAttachMenu((prev) => !prev)}
                  aria-label="Open tools"
                >
                  <BsPlusLg />
                </button>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything"
                />
                {!isRecording && (
                  <button
                    type="button"
                    className="legal-ai-chat-icon"
                    onClick={startMicRecording}
                    aria-label="Start microphone"
                  >
                    <BsMic />
                  </button>
                )}
                {isRecording && (
                  <button
                    type="button"
                    className="legal-ai-chat-icon stop"
                    onClick={stopMicRecording}
                    aria-label="Stop microphone"
                  >
                    ■
                  </button>
                )}
                <button
                  type="submit"
                  className="legal-ai-send-round"
                  aria-label="Send"
                  disabled={isLoadingAnswer}
                >
                  <BsArrowUp />
                </button>
              </form>
            </div>

            <input
              ref={anyFileInputRef}
              type="file"
              multiple
              className="legal-ai-hidden-input"
              onChange={(e) => {
                void addFiles(e.target.files, "file");
                e.target.value = "";
              }}
            />
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="legal-ai-hidden-input"
              onChange={(e) => {
                void addFiles(e.target.files, "audio");
                e.target.value = "";
              }}
            />
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/*"
              multiple
              className="legal-ai-hidden-input"
              onChange={(e) => {
                void addFiles(e.target.files, "video");
                e.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="legal-ai-hidden-input"
              onChange={(e) => {
                void addFiles(e.target.files, "camera");
                e.target.value = "";
              }}
            />

            <p className="legal-ai-disclaimer">
              Disclaimer: General legal information only, not formal legal
              advice.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

export default LegalAssistant;
