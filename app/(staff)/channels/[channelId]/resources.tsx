import { api } from "@/api/axios";
import LinkList from "@/components/channels/LinkList";
import NoteList from "@/components/channels/NoteList";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import ResourceCard from "@/components/resources/ResourceCard";
import SkeletonCard from "@/components/resources/SkeletonCard";
import UploadChooser from "@/components/resources/UploadChooser";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { SwipeableTabView } from "@/components/ui/SwipeableTabView";
import { showError, showSuccess } from "@/components/ui/toast";
import { PRIMARY } from "@/constants/Colors";
import {
    clearLinksForChannel,
    selectChannelLinks,
    selectChannelLinksStatus,
} from "@/redux/channelLinks/channelLinks.slice";
import {
    createChannelLink,
    deleteChannelLink,
    fetchChannelLinks,
    updateChannelLink,
} from "@/redux/channelLinks/channelLinks.thunks";
import type { ChannelLink } from "@/redux/channelLinks/channelLinks.types";
import {
    clearNotesForChannel,
    selectChannelNotes,
    selectChannelNotesStatus,
} from "@/redux/channelNotes/channelNotes.slice";
import {
    createChannelNote,
    deleteChannelNote,
    fetchChannelNotes,
    updateChannelNote,
} from "@/redux/channelNotes/channelNotes.thunks";
import type { ChannelNote } from "@/redux/channelNotes/channelNotes.types";
import { selectChannelById } from "@/redux/channels/channels.slice";
import { fetchChannelById } from "@/redux/channels/channels.thunks";
import type { ChannelResource } from "@/redux/channels/resources.types";
import {
    CATEGORY_ORDER,
    detectCategory,
    ext,
    prettyCategory,
} from "@/redux/channels/resources.utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { makeDescriptionFromName } from "@/utils/buildApiResources";
import { getMimeFromName } from "@/utils/getMime";
import { slugifyFilename } from "@/utils/slugAndCloudinary";
import { Audio, Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import {
    ArrowUpDown,
    CloudUpload,
    Maximize2,
    Plus,
    X,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    InteractionManager,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    SectionList,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    GestureHandlerRootView,
    State as GestureState,
    TapGestureHandler,
} from "react-native-gesture-handler";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

function ensureHttpUrl(u?: string | null) {
    if (!u) return "";
    const trimmed = u.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
        return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    if (trimmed.startsWith("data:") || trimmed.startsWith("file:"))
        return trimmed;
    return `https://${trimmed}`;
}

const TABS = [
    { id: "resources", label: "Resources" },
    { id: "links", label: "Links" },
    { id: "notes", label: "Notes" },
] as const;

type ChannelTab = (typeof TABS)[number]["id"];
const SWIPE_THRESHOLD = 60;

async function normalizeImageForUpload(asset: any) {
    const origUri = asset.uri as string;

    const lower = (asset.fileName || origUri).toLowerCase();
    const mt = String(asset.mimeType || "").toLowerCase();

    const isHeicOrHeif =
        lower.endsWith(".heic") ||
        lower.endsWith(".heif") ||
        mt.includes("heic") ||
        mt.includes("heif");

    // shrink rules
    const MAX_W = 1600; // adjust 1200–2000
    const JPEG_QUALITY = 0.65; // adjust 0.5–0.8

    // if picker gives width/height, use it to scale; otherwise just compress
    const w = Number(asset.width || 0);
    const h = Number(asset.height || 0);

    const shouldResize = w > 0 && h > 0 && Math.max(w, h) > MAX_W;

    const resizeAction = shouldResize
        ? [{ resize: w >= h ? { width: MAX_W } : { height: MAX_W } }]
        : [];

    const out = await ImageManipulator.manipulateAsync(origUri, resizeAction, {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
    });

    const baseName =
        asset.fileName?.replace(/\.(heic|heif|png|jpg|jpeg)$/i, "") ||
        `image_${Date.now()}`;

    return {
        uri: out.uri,
        name: slugifyFilename(`${baseName}.jpg`),
        mime: "image/jpeg",
    };
}

export default function ChannelResourcesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isIOS = Platform.OS === "ios";

    const { channelId } = useLocalSearchParams<{ channelId: string }>();
    const dispatch = useAppDispatch();
    const channel = useAppSelector(selectChannelById(channelId || ""));
    const links = useAppSelector(
        useMemo(() => selectChannelLinks(channelId || ""), [channelId]),
    );
    const linksStatus = useAppSelector(
        selectChannelLinksStatus(channelId || ""),
    );
    const notes = useAppSelector(
        useMemo(() => selectChannelNotes(channelId || ""), [channelId]),
    );
    const notesStatus = useAppSelector(
        selectChannelNotesStatus(channelId || ""),
    );

    const [selection, setSelection] = useState<string | null>(null);
    const [chooser, setChooser] = useState(false);
    const [picking, setPicking] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [actionFor, setActionFor] = useState<ChannelResource | null>(null);
    const [emptyChooserOpen, setEmptyChooserOpen] = useState(false);

    const routes = useMemo(
        () => TABS.map((t) => ({ key: t.id, title: t.label })),
        [],
    );

    const [index, setIndex] = useState(0);

    const activeTab = routes[index]?.key as ChannelTab;

    const [linkModalVisible, setLinkModalVisible] = useState(false);
    const [linkForm, setLinkForm] = useState({
        title: "",
        url: "",
        description: "",
    });
    const [editingLink, setEditingLink] = useState<ChannelLink | null>(null);
    const [linkSubmitting, setLinkSubmitting] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<ChannelLink | null>(null);

    const [noteModalVisible, setNoteModalVisible] = useState(false);
    const [noteForm, setNoteForm] = useState({ title: "", description: "" });
    const [editingNote, setEditingNote] = useState<ChannelNote | null>(null);
    const [noteSubmitting, setNoteSubmitting] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<ChannelNote | null>(null);
    const [resourceToDelete, setResourceToDelete] =
        useState<ChannelResource | null>(null);
    const [resourceDeleting, setResourceDeleting] = useState(false);
    const [previewNote, setPreviewNote] = useState<ChannelNote | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{
        type: "image" | "video" | "audio";
        uri: string;
        name?: string;
        mime?: string;
    } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [sortOrder, setSortOrder] = useState<{
        resources: "asc" | "desc";
        links: "asc" | "desc";
        notes: "asc" | "desc";
    }>({
        resources: "desc",
        links: "desc",
        notes: "desc",
    });

    const [pendingPick, setPendingPick] = useState<null | "doc" | "image">(
        null,
    );

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!channelId) return;
            try {
                setLoadingInitial(true);
                await dispatch(fetchChannelById(channelId)).unwrap();
            } catch {
            } finally {
                if (mounted) setLoadingInitial(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [channelId, dispatch]);

    useEffect(() => {
        if (!channelId) return;
        dispatch(fetchChannelLinks(channelId));
        dispatch(fetchChannelNotes(channelId));
        return () => {
            dispatch(clearLinksForChannel(channelId));
            dispatch(clearNotesForChannel(channelId));
        };
    }, [channelId, dispatch]);

    useEffect(() => {
        if (activeTab !== "resources") {
            setChooser(false);
            setEmptyChooserOpen(false);
            setActionFor(null);
        }
    }, [activeTab]);

    const sections = useMemo(() => {
        const list: ChannelResource[] = (channel?.resources as any) || [];

        const toMs = (v: any) => {
            if (!v) return 0;
            const t =
                typeof v === "string" || typeof v === "number"
                    ? new Date(v).getTime()
                    : 0;
            return Number.isFinite(t) ? t : 0;
        };

        const sorted = [...list].sort((a: any, b: any) => {
            const aMs = toMs((a as any).createdAt);
            const bMs = toMs((b as any).createdAt);
            return sortOrder.resources === "asc" ? aMs - bMs : bMs - aMs;
        });

        const bucket = new Map<string, ChannelResource[]>();
        for (const r of sorted) {
            const cat = detectCategory(r);
            if (!bucket.has(cat)) bucket.set(cat, []);
            bucket.get(cat)!.push(r);
        }

        return CATEGORY_ORDER.map((cat) => ({
            title: prettyCategory(cat),
            data: bucket.get(cat) || [],
        })).filter((s) => s.data.length > 0);
    }, [channel?.resources, sortOrder.resources]);

    async function ensureFileUri(uri: string, filename: string) {
        // Already a file URI
        if (uri.startsWith("file://")) return uri;

        // content:// (common on Android) or ph:// (can happen on iOS)
        // Copy into cache as a real file:// path
        const dest = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.copyAsync({ from: uri, to: dest });
        return dest;
    }

    const uploadDirect = async (input: {
        uri: string;
        name: string;
        mime: string;
        description?: string;
    }) => {
        if (!channelId) return;
        const form = new FormData();
        form.append("channelId", channelId);
        form.append("name", input.name);
        form.append(
            "description",
            input.description || makeDescriptionFromName(input.name),
        );
        form.append("mime", input.mime);
        form.append("pdfUpload", {
            uri: input.uri,
            type: input.mime,
            name: input.name,
        } as any);
        await api.post("/channel/upload-resources", form, {
            headers: {
                Accept: "application/json",
            },
            onUploadProgress: (evt) => {
                if (!evt.total) return;
                const pct = Math.round((evt.loaded / evt.total) * 100);
                setUploadProgress(pct);
            },
            transformRequest: (v) => v,
        });
    };

    const handlePickImage = async () => {
        if (picking) return;
        setPicking(true);
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            showError("Allow photos permission to pick images.");
            setPicking(false);
            return;
        }
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.9,
                allowsMultipleSelection: true,
                selectionLimit: 10,
            } as any);
            if ((res as any).canceled) return;

            const assets = (res as any).assets || [];
            let uploaded = 0;
            setUploading(true);
            for (const a of assets) {
                // 1) convert (if heic) and get final uri/name/mime
                const normalized = await normalizeImageForUpload(a);

                // 2) make sure it is a real file:// uri (usually already is)
                const finalUri = await ensureFileUri(
                    normalized.uri,
                    normalized.name,
                );

                // 3) verify what you're about to send
                const info = await FileSystem.getInfoAsync(finalUri);
                console.log("UPLOAD FILE:", {
                    exists: info.exists,
                    size: info.size,
                    uri: finalUri,
                    name: normalized.name,
                    mime: normalized.mime,
                });

                try {
                    await uploadDirect({
                        uri: finalUri,
                        name: normalized.name,
                        mime: normalized.mime,
                        description: "Image resource",
                    });
                    uploaded += 1;
                } catch (error: any) {
                    console.log("UPLOAD FAIL message:", error?.message);
                    console.log("UPLOAD FAIL status:", error?.response?.status);
                    console.log("UPLOAD FAIL data:", error?.response?.data);
                }
            }

            if (uploaded > 0) {
                showSuccess("Image uploaded");
                await dispatch(fetchChannelById(channelId!)).unwrap();
            }
        } catch (error: any) {
            console.log("UPLOAD ERROR message:", error?.message);
            console.log("UPLOAD ERROR status:", error?.response?.status);
            console.log("UPLOAD ERROR data:", error?.response?.data);
            console.log("UPLOAD ERROR headers:", error?.response?.headers);
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setPicking(false);
        }
    };

    const pickingLock = React.useRef(false);
    const docPickerBlockedUntil = React.useRef(0);

    const handlePickDocument = async () => {
        if (picking) return;
        setPicking(true);

        if (Date.now() < docPickerBlockedUntil.current) {
            showError("Please wait a moment and try again.");
            setPicking(false);
            return;
        }

        pickingLock.current = true;
        setPicking(true);
        try {
            console.log("about to open picker");

            const res = await DocumentPicker.getDocumentAsync({
                multiple: true,
                copyToCacheDirectory: true,
            } as any);

            console.log("picker returned", res);
            if ((res as any).canceled) return;

            const files = Array.isArray((res as any).assets)
                ? (res as any).assets
                : [res];
            const directPdfUploads: Array<{ uri: string; name: string }> = [];
            const directUploads: Array<{
                uri: string;
                name: string;
                mime: string;
                description: string;
            }> = [];

            for (const f of files as any[]) {
                const origName = f.name || "file";
                const safeName = slugifyFilename(origName);
                const mime =
                    f.mimeType ||
                    getMimeFromName(origName) ||
                    "application/octet-stream";
                const isPdf =
                    mime === "application/pdf" ||
                    ext(safeName).toLowerCase() === "pdf";
                if (isPdf) {
                    directPdfUploads.push({
                        uri: f.uri as string,
                        name: safeName.endsWith(".pdf")
                            ? safeName
                            : `${safeName}.pdf`,
                    });
                    continue;
                }
                if (mime.startsWith("image/")) {
                    directUploads.push({
                        uri: f.uri as string,
                        name: safeName,
                        mime,
                        description: "Image resource",
                    });
                } else if (mime.startsWith("audio/")) {
                    directUploads.push({
                        uri: f.uri as string,
                        name: safeName,
                        mime,
                        description: "Audio resource",
                    });
                } else if (mime.startsWith("video/")) {
                    directUploads.push({
                        uri: f.uri as string,
                        name: safeName,
                        mime,
                        description: "Video resource",
                    });
                } else {
                    directUploads.push({
                        uri: f.uri as string,
                        name: safeName,
                        mime,
                        description: "Document resource",
                    });
                }
            }

            let pdfUploadOk = 0;
            let otherUploadOk = 0;
            setUploading(true);
            for (const pdf of directPdfUploads) {
                try {
                    await uploadDirect({
                        uri: pdf.uri,
                        name: pdf.name,
                        mime: "application/pdf",
                        description: "PDF document",
                    });
                    pdfUploadOk += 1;
                } catch (error: any) {
                    console.log("Failed to upload PDF directly", {
                        message: error?.message,
                        code: error?.code,
                        status: error?.response?.status,
                        data: error?.response?.data,
                    });
                    showError(`Failed to upload ${pdf.name}`);
                }
            }

            for (const item of directUploads) {
                try {
                    await uploadDirect(item);
                    otherUploadOk += 1;
                } catch (error: any) {
                    console.log("Failed to upload file directly", {
                        message: error?.message,
                        code: error?.code,
                        status: error?.response?.status,
                        data: error?.response?.data,
                    });
                    showError(`Failed to upload ${item.name}`);
                }
            }

            if (directPdfUploads.length + directUploads.length > 0) {
                if (pdfUploadOk + otherUploadOk > 0) {
                    showSuccess("Resources uploaded");
                }
                await dispatch(fetchChannelById(channelId!)).unwrap();
            }
        } catch (e: any) {
            const msg = String(e?.message || e);
            console.log("Document picker failed", e);

            if (msg.includes("Different document picking in progress")) {
                docPickerBlockedUntil.current = Date.now() + 2000; // cooldown
                showError("File picker is still closing. Try again.");
                return;
            }

            showError("Failed to open file picker");
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setPicking(false);
            pickingLock.current = false;
        }
    };

    const toFileUrl = (p: string) =>
        p.startsWith("file://") ? p : `file://${p}`;

    const getResourceMime = (r: ChannelResource) =>
        r.mimetype || r.mime || getMimeFromName(r.name || r.resourceUpload);

    const getResourceUri = (r: ChannelResource) => {
        const mime = getResourceMime(r) || "application/octet-stream";
        if (r.rawFile) return `data:${mime};base64,${r.rawFile}`;
        return ensureHttpUrl(r.resourceUpload);
    };

    const previewResource = async (r: ChannelResource) => {
        const mime = getResourceMime(r);
        const cat = detectCategory(r);
        const uri = getResourceUri(r);

        if (cat === "image" || cat === "video" || cat === "audio") {
            if (!uri) {
                showError("This resource has no preview data.");
                return;
            }
            setPreviewMedia({
                type:
                    cat === "image"
                        ? "image"
                        : cat === "video"
                          ? "video"
                          : "audio",
                uri,
                name: r.name,
                mime: mime || undefined,
            });
            return;
        }

        if (mime === "application/pdf" || ext(r.name) === "pdf") {
            try {
                const safeName = slugifyFilename(r.name || "document.pdf");
                const filename = safeName.toLowerCase().endsWith(".pdf")
                    ? safeName
                    : `${safeName}.pdf`;

                const dest = `${FileSystem.cacheDirectory}${filename}`;

                if (r.rawFile) {
                    await FileSystem.writeAsStringAsync(dest, r.rawFile, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                } else if (uri) {
                    await FileSystem.downloadAsync(uri, dest);
                }

                // ✅ WEB: data URL is fine
                if (Platform.OS === "web") {
                    if (r.rawFile) {
                        await WebBrowser.openBrowserAsync(
                            `data:application/pdf;base64,${r.rawFile}`,
                        );
                    } else if (uri) {
                        await WebBrowser.openBrowserAsync(uri);
                    }
                    return;
                }

                // iOS: prefer direct open first (share sheet can leave a stuck dim overlay on some devices)
                if (Platform.OS === "ios") {
                    try {
                        await Linking.openURL(toFileUrl(dest));
                        return;
                    } catch {}

                    // Fallback to share sheet only if direct open fails.
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(dest, {
                            mimeType: "application/pdf",
                            dialogTitle: "Open PDF",
                        });
                        return;
                    }
                }

                // ✅ Android: content:// then open
                if (Platform.OS === "android") {
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(dest, {
                            mimeType: "application/pdf",
                            dialogTitle: "Open PDF",
                        });
                        return;
                    }

                    // fallback
                    const contentUri =
                        await FileSystem.getContentUriAsync(dest);
                    await Linking.openURL(contentUri);
                    return;
                }
            } catch (e) {
                console.log("Failed to open PDF", e);
                showError("Failed to open PDF");
            }
            return;
        }

        const url = ensureHttpUrl(r.resourceUpload);
        if (!url) return;
        try {
            await WebBrowser.openBrowserAsync(url, {
                enableBarCollapsing: true,
                showTitle: true,
                toolbarColor: "#ffffff",
            });
        } catch {
            try {
                await Linking.openURL(url);
            } catch {
                showError("Failed to open preview");
            }
        }
    };

    const copyLink = async (r: ChannelResource) => {
        try {
            const { setStringAsync } = await import("expo-clipboard");
            const url = ensureHttpUrl(r.resourceUpload);
            if (!url) {
                showError("No link available for this resource.");
                return;
            }
            await setStringAsync(url);
            showSuccess("Link copied");
        } catch {}
    };

    const copySharedLink = async (link: ChannelLink) => {
        try {
            const { setStringAsync } = await import("expo-clipboard");
            await setStringAsync(ensureHttpUrl(link.url));
            showSuccess("Link copied");
        } catch {}
    };

    const openSharedLink = async (rawUrl: string) => {
        const url = ensureHttpUrl(rawUrl);
        if (!url) return;
        try {
            await WebBrowser.openBrowserAsync(url, {
                enableBarCollapsing: true,
                showTitle: true,
                toolbarColor: "#ffffff",
            });
        } catch {
            try {
                await Linking.openURL(url);
            } catch {
                showError("Failed to open link");
            }
        }
    };

    const handleDeleteLink = async () => {
        if (!channelId || !linkToDelete) return;
        try {
            await dispatch(
                deleteChannelLink({
                    channelId,
                    linkId: linkToDelete._id,
                }),
            ).unwrap();
        } finally {
            setLinkToDelete(null);
        }
    };

    const handleDeleteNote = async () => {
        if (!channelId || !noteToDelete) return;
        try {
            await dispatch(
                deleteChannelNote({
                    channelId,
                    noteId: noteToDelete._id,
                }),
            ).unwrap();
        } finally {
            setNoteToDelete(null);
        }
    };

    const handleDeleteResource = async () => {
        if (!channelId || !resourceToDelete || resourceDeleting) return;
        const resourceId = resourceToDelete._id;
        if (!resourceId) {
            showError("Resource ID is missing. Unable to delete.");
            setResourceToDelete(null);
            return;
        }

        try {
            setResourceDeleting(true);
            await api.delete("/channel/delete-resource", {
                data: {
                    channelId,
                    resourceId,
                },
            });
            showSuccess("Resource deleted");
            await dispatch(fetchChannelById(channelId)).unwrap();
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to delete resource.";
            showError(String(message));
        } finally {
            setResourceDeleting(false);
            setResourceToDelete(null);
        }
    };

    const downloadResource = async (r: ChannelResource) => {
        try {
            const mime = getResourceMime(r);
            const safeName = slugifyFilename(r.name || "resource");
            const filename = safeName || "resource";
            const dest = `${FileSystem.cacheDirectory}${filename}`;

            if (r.rawFile) {
                await FileSystem.writeAsStringAsync(dest, r.rawFile, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            } else {
                const url = ensureHttpUrl(r.resourceUpload);
                if (!url) {
                    showError("No file available to download.");
                    return;
                }
                await FileSystem.downloadAsync(url, dest);
            }

            if (Platform.OS === "web") {
                const url = ensureHttpUrl(r.resourceUpload);
                if (url) await WebBrowser.openBrowserAsync(url);
                return;
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(dest, {
                    mimeType: mime || undefined,
                    dialogTitle: "Save resource",
                });
                return;
            }

            showSuccess("Resource saved to device.");
        } catch {
            showError("Failed to download resource.");
        }
    };

    const handleSaveLink = async () => {
        if (!channelId || linkSubmitting) return;
        const rawUrl = linkForm.url.trim();
        if (!rawUrl) {
            showError("Please paste a link.");
            return;
        }
        const normalized = ensureHttpUrl(rawUrl);
        try {
            // eslint-disable-next-line no-new
            new URL(normalized);
        } catch {
            showError("That doesn’t look like a valid link.");
            return;
        }

        const trimmedTitle = linkForm.title.trim();
        const trimmedDescription = linkForm.description.trim();
        const payload = {
            channelId,
            title: trimmedTitle || null,
            url: normalized,
            description: trimmedDescription || null,
        };

        setLinkSubmitting(true);
        try {
            if (editingLink) {
                await dispatch(
                    updateChannelLink({
                        channelId,
                        linkId: editingLink._id,
                        title: payload.title,
                        url: payload.url,
                        description: payload.description,
                    }),
                ).unwrap();
            } else {
                await dispatch(createChannelLink(payload)).unwrap();
            }
            await dispatch(fetchChannelLinks(channelId));
            closeLinkModal();
        } finally {
            setLinkSubmitting(false);
        }
    };

    const closeLinkModal = () => {
        setLinkModalVisible(false);
        setEditingLink(null);
        setLinkForm({ title: "", url: "", description: "" });
    };

    const openLinkModal = (link?: ChannelLink) => {
        if (link) {
            setEditingLink(link);
            setLinkForm({
                title: link.title ?? "",
                url: link.url,
                description: link.description ?? "",
            });
        } else {
            setEditingLink(null);
            setLinkForm({ title: "", url: "", description: "" });
        }
        setLinkModalVisible(true);
    };

    const handleSaveNote = async () => {
        if (!channelId || noteSubmitting) return;
        const title = noteForm.title.trim();
        if (!title) {
            showError("Give the note a title.");
            return;
        }

        setNoteSubmitting(true);
        try {
            if (editingNote) {
                await dispatch(
                    updateChannelNote({
                        channelId,
                        noteId: editingNote._id,
                        title,
                        description: noteForm.description.trim() || "",
                    }),
                ).unwrap();
            } else {
                await dispatch(
                    createChannelNote({
                        channelId,
                        title,
                        description: noteForm.description.trim() || "",
                    }),
                ).unwrap();
            }
            await dispatch(fetchChannelNotes(channelId));
            closeNoteModal();
        } finally {
            setNoteSubmitting(false);
        }
    };

    const closeNoteModal = () => {
        setNoteModalVisible(false);
        setEditingNote(null);
        setNoteForm({ title: "", description: "" });
    };

    const openNoteModal = (note?: ChannelNote) => {
        if (note) {
            setEditingNote(note);
            setNoteForm({
                title: note.title || "",
                description: note.description || "",
            });
        } else {
            setEditingNote(null);
            setNoteForm({ title: "", description: "" });
        }
        setNoteModalVisible(true);
    };

    // const headerPaddingTop = insets.top + 12;

    const sortedLinks = useMemo(() => {
        const toMs = (v: any) => {
            if (!v) return 0;
            const t =
                typeof v === "string" || typeof v === "number"
                    ? new Date(v).getTime()
                    : 0;
            return Number.isFinite(t) ? t : 0;
        };
        return [...links].sort((a, b) => {
            const diff = toMs(a.createdAt) - toMs(b.createdAt);
            return sortOrder.links === "asc" ? diff : -diff;
        });
    }, [links, sortOrder.links]);

    const sortedNotes = useMemo(() => {
        const toMs = (v: any) => {
            if (!v) return 0;
            const t =
                typeof v === "string" || typeof v === "number"
                    ? new Date(v).getTime()
                    : 0;
            return Number.isFinite(t) ? t : 0;
        };
        return [...notes].sort((a, b) => {
            const diff = toMs(a.createdAt) - toMs(b.createdAt);
            return sortOrder.notes === "asc" ? diff : -diff;
        });
    }, [notes, sortOrder.notes]);

    const isLinksLoading = linksStatus === "loading" && links.length === 0;
    const isNotesLoading = notesStatus === "loading" && notes.length === 0;
    const isLinksRefreshing = linksStatus === "loading" && links.length > 0;
    const isNotesRefreshing = notesStatus === "loading" && notes.length > 0;

    const refreshLinks = useCallback(async () => {
        if (!channelId) return;
        await dispatch(fetchChannelLinks(channelId));
    }, [channelId, dispatch]);

    const refreshNotes = useCallback(async () => {
        if (!channelId) return;
        await dispatch(fetchChannelNotes(channelId));
    }, [channelId, dispatch]);

    const toggleSortOrder = useCallback((tab: ChannelTab) => {
        setSortOrder((prev) => ({
            ...prev,
            [tab]: prev[tab] === "asc" ? "desc" : "asc",
        }));
    }, []);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="Resources"
                headerRight={({ tintColor }) => (
                    <View className="flex-row items-center gap-2 ios:mr-3">
                        <Pressable
                            onPress={() => toggleSortOrder(activeTab)}
                            className="w-10 h-10 rounded-full items-center justify-center"
                            hitSlop={8}
                            style={{
                                backgroundColor: PRIMARY,
                            }}
                            accessibilityLabel={`Sort ${activeTab} ${
                                sortOrder[activeTab] === "asc"
                                    ? "descending"
                                    : "ascending"
                            }`}
                        >
                            <ArrowUpDown size={20} color="white" />
                        </Pressable>
                        {activeTab === "resources" ? (
                            <Pressable
                                onPress={() => setChooser(true)}
                                accessibilityLabel="Upload files"
                                className="w-10 h-10 items-center justify-center"
                                hitSlop={8}
                            >
                                <CloudUpload
                                    size={20}
                                    color={tintColor ?? "#111827"}
                                />
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={() =>
                                    activeTab === "links"
                                        ? openLinkModal()
                                        : openNoteModal()
                                }
                                className="w-10 h-10 items-center justify-center"
                                hitSlop={8}
                            >
                                <Plus
                                    size={22}
                                    color={tintColor ?? "#111827"}
                                />
                            </Pressable>
                        )}
                    </View>
                )}
            />

            {/* Swipeable content */}
            <SwipeableTabView
                navigationState={{ index, routes }}
                onIndexChange={setIndex}
                tabBarProps={{
                    activeColor: PRIMARY,
                    inactiveColor: "#6B7280",
                }}
                renderScene={({ route }) => {
                    if (route.key === "resources") {
                        return (
                            <View className="flex-1">
                                {loadingInitial ? (
                                    <View className="px-4 pt-4 flex-row flex-wrap">
                                        <SkeletonCard width={170} />
                                        <SkeletonCard width={170} />
                                        <SkeletonCard width={170} />
                                        <SkeletonCard width={170} />
                                    </View>
                                ) : sections.length === 0 ? (
                                    <View className="flex-1 items-center justify-center p-6">
                                        <Text className="text-gray-500 font-kumbh">
                                            No resources yet.
                                        </Text>

                                        {!emptyChooserOpen ? (
                                            <View className="flex-row gap-3 mt-3">
                                                <Pressable
                                                    onPress={() =>
                                                        setEmptyChooserOpen(
                                                            true,
                                                        )
                                                    }
                                                    className="px-4 py-2 rounded-xl bg-[#4C5FAB]"
                                                >
                                                    <Text className="text-white font-kumbhBold">
                                                        Add resources
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        ) : (
                                            <View className="mt-3 w-full max-w-[320px] rounded-2xl border border-gray-200 p-3">
                                                <Text className="font-kumbhBold mb-2 text-gray-900">
                                                    Choose action
                                                </Text>
                                                <Pressable
                                                    onPress={() => {
                                                        setEmptyChooserOpen(
                                                            false,
                                                        );
                                                        setChooser(true);
                                                    }}
                                                    className="py-2"
                                                >
                                                    <Text className="font-kumbh text-gray-800">
                                                        Upload files
                                                        (images/docs)
                                                    </Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => {
                                                        setEmptyChooserOpen(
                                                            false,
                                                        );
                                                        openLinkModal();
                                                    }}
                                                    className="py-2"
                                                >
                                                    <Text className="font-kumbh text-gray-800">
                                                        Add a link
                                                    </Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() =>
                                                        setEmptyChooserOpen(
                                                            false,
                                                        )
                                                    }
                                                    className="py-2"
                                                >
                                                    <Text className="font-kumbh text-gray-500">
                                                        Cancel
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <SectionList
                                        sections={sections}
                                        keyExtractor={(item, idx) =>
                                            (item._id || item.resourceUpload) +
                                            ":" +
                                            idx
                                        }
                                        renderSectionHeader={({
                                            section: { title },
                                        }) => (
                                            <Text className="px-4 py-4 font-kumbhBold text-gray-900">
                                                {title}
                                            </Text>
                                        )}
                                        renderItem={() => null}
                                        renderSectionFooter={({ section }) => (
                                            <View className="px-4">
                                                <FlatList
                                                    data={section.data}
                                                    numColumns={2}
                                                    columnWrapperStyle={{
                                                        justifyContent:
                                                            "space-between",
                                                        marginBottom: 8,
                                                    }}
                                                    keyExtractor={(it, idx) =>
                                                        (it._id ||
                                                            it.resourceUpload) +
                                                        ":" +
                                                        idx
                                                    }
                                                    renderItem={({ item }) => (
                                                        <ResourceCard
                                                            item={item}
                                                            width={0}
                                                            className="w-[48%]"
                                                            selected={
                                                                selection ===
                                                                item._id
                                                            }
                                                            onPress={() => {
                                                                setSelection(
                                                                    selection ===
                                                                        item._id
                                                                        ? null
                                                                        : item._id ||
                                                                              null,
                                                                );
                                                                previewResource(
                                                                    item,
                                                                );
                                                            }}
                                                            onMenu={() =>
                                                                setActionFor(
                                                                    item,
                                                                )
                                                            }
                                                        />
                                                    )}
                                                    showsVerticalScrollIndicator={
                                                        false
                                                    }
                                                />
                                            </View>
                                        )}
                                        stickySectionHeadersEnabled={false}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{
                                            paddingBottom: 110,
                                        }}
                                    />
                                )}
                            </View>
                        );
                    }

                    if (route.key === "links") {
                        return (
                            <LinkList
                                links={sortedLinks}
                                isLoading={isLinksLoading}
                                isRefreshing={isLinksRefreshing}
                                onRefresh={refreshLinks}
                                onOpenLink={(link) => openSharedLink(link.url)}
                                onCopyLink={copySharedLink}
                                onEditLink={(link) => openLinkModal(link)}
                                onDeleteLink={(link) => setLinkToDelete(link)}
                            />
                        );
                    }

                    return (
                        <NoteList
                            notes={sortedNotes}
                            isLoading={isNotesLoading}
                            isRefreshing={isNotesRefreshing}
                            onRefresh={refreshNotes}
                            onEditNote={(note) => openNoteModal(note)}
                            onDeleteNote={(note) => setNoteToDelete(note)}
                            onPreviewNote={(note) => setPreviewNote(note)}
                        />
                    );
                }}
            />

            {/* Floating button only on resources */}
            {activeTab === "resources" && (
                <Pressable
                    onPress={() => setChooser(true)}
                    className="absolute right-4 bottom-6 h-14 w-14 rounded-full bg-[#4C5FAB] items-center justify-center"
                    style={{
                        shadowColor: "#000",
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 4 },
                    }}
                    accessibilityLabel="Upload files"
                >
                    <CloudUpload size={22} color="#fff" />
                </Pressable>
            )}

            {/* Keep chooser + modals exactly as you already have */}
            {activeTab === "resources" && (
                <UploadChooser
                    visible={chooser}
                    onClose={() => setChooser(false)}
                    disabled={picking}
                    onPick={(type) => {
                        setPendingPick(type);
                        setChooser(false);

                        if (Platform.OS === "android") {
                            // Run after modal closing animation/layout settles
                            InteractionManager.runAfterInteractions(() => {
                                if (type === "doc") handlePickDocument();
                                else handlePickImage();
                            });
                        }
                    }}
                    onDismiss={() => {
                        // iOS only
                        if (Platform.OS !== "ios") return;

                        const type = pendingPick;
                        if (!type) return;

                        setPendingPick(null);

                        InteractionManager.runAfterInteractions(() => {
                            if (type === "doc") handlePickDocument();
                            else handlePickImage();
                        });
                    }}
                />
            )}

            <Modal
                visible={linkModalVisible}
                animationType="slide"
                transparent
                onRequestClose={closeLinkModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.select({
                        ios: "padding",
                        android: undefined,
                    })}
                    className="flex-1 justify-end"
                    style={{
                        paddingTop:
                            Platform.OS === "ios" ? insets.top + 10 : 10,
                    }}
                >
                    <Pressable
                        className="absolute inset-0 bg-black/30"
                        onPress={() => !linkSubmitting && closeLinkModal()}
                    />
                    <ScrollView
                        className="bg-white rounded-t-2xl"
                        contentContainerStyle={{ padding: 20 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text className="font-kumbhBold text-lg mb-3">
                            {editingLink ? "Edit link" : "Add a link"}
                        </Text>

                        <Text className="font-kumbh text-xs text-gray-500 mb-1">
                            Title (optional)
                        </Text>
                        <View className="border border-gray-200 rounded-xl px-3 py-2 mb-3">
                            <TextInput
                                placeholder="e.g. Project brief"
                                value={linkForm.title}
                                onChangeText={(value) =>
                                    setLinkForm((prev) => ({
                                        ...prev,
                                        title: value,
                                    }))
                                }
                                className="font-kumbh text-gray-900"
                                editable={!linkSubmitting}
                            />
                        </View>

                        <Text className="font-kumbh text-xs text-gray-500 mb-1">
                            URL
                        </Text>
                        <View className="border border-gray-200 rounded-xl px-3 py-2 mb-3">
                            <TextInput
                                placeholder="https://example.com"
                                value={linkForm.url}
                                onChangeText={(value) =>
                                    setLinkForm((prev) => ({
                                        ...prev,
                                        url: value,
                                    }))
                                }
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                className="font-kumbh text-gray-900"
                                editable={!linkSubmitting}
                            />
                        </View>

                        <Text className="font-kumbh text-xs text-gray-500 mb-1">
                            Description (optional)
                        </Text>
                        <View className="border border-gray-200 rounded-xl px-3 py-2">
                            <TextInput
                                placeholder="Add extra context"
                                value={linkForm.description}
                                onChangeText={(value) =>
                                    setLinkForm((prev) => ({
                                        ...prev,
                                        description: value,
                                    }))
                                }
                                multiline
                                numberOfLines={3}
                                className="font-kumbh text-gray-900"
                                editable={!linkSubmitting}
                            />
                        </View>

                        <View className="flex-row justify-end gap-3 mt-4">
                            <Pressable
                                onPress={closeLinkModal}
                                disabled={linkSubmitting}
                                className="px-4 py-2 rounded-xl bg-gray-100"
                            >
                                <Text className="font-kumbh text-gray-700">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveLink}
                                disabled={linkSubmitting}
                                className="px-4 py-2 rounded-xl bg-[#4C5FAB]"
                            >
                                {linkSubmitting ? (
                                    <View className="flex-row items-center">
                                        <ActivityIndicator color="#fff" />
                                        <Text className="text-white font-kumbh ml-2">
                                            Saving…
                                        </Text>
                                    </View>
                                ) : (
                                    <Text className="text-white font-kumbhBold">
                                        Save link
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={noteModalVisible}
                animationType="slide"
                transparent
                onRequestClose={closeNoteModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.select({
                        ios: "padding",
                        android: undefined,
                    })}
                    className="flex-1 justify-end"
                    style={{
                        paddingTop:
                            Platform.OS === "ios" ? insets.top + 10 : 10,
                    }}
                >
                    <Pressable
                        className="absolute inset-0 bg-black/30"
                        onPress={() => !noteSubmitting && closeNoteModal()}
                    />
                    <ScrollView
                        className="bg-white rounded-t-2xl"
                        contentContainerStyle={{ padding: 20 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text className="font-kumbhBold text-lg mb-3">
                            {editingNote ? "Edit note" : "Add a note"}
                        </Text>

                        <Text className="font-kumbh text-xs text-gray-500 mb-1">
                            Title
                        </Text>
                        <View className="border border-gray-200 rounded-xl px-3 py-2 mb-3">
                            <TextInput
                                placeholder="Note title"
                                value={noteForm.title}
                                onChangeText={(value) =>
                                    setNoteForm((prev) => ({
                                        ...prev,
                                        title: value,
                                    }))
                                }
                                className="font-kumbh text-gray-900"
                                editable={!noteSubmitting}
                            />
                        </View>

                        <Text className="font-kumbh text-xs text-gray-500 mb-1">
                            Description
                        </Text>
                        <View className="border border-gray-200 rounded-xl px-3 py-2">
                            <TextInput
                                placeholder="Write your note here"
                                value={noteForm.description}
                                onChangeText={(value) =>
                                    setNoteForm((prev) => ({
                                        ...prev,
                                        description: value,
                                    }))
                                }
                                multiline
                                numberOfLines={16}
                                className="font-kumbh text-gray-900"
                                editable={!noteSubmitting}
                                style={{
                                    minHeight: 500,
                                    textAlignVertical: "top",
                                }}
                            />
                        </View>

                        <View className="flex-row justify-end gap-3 mt-4">
                            <Pressable
                                onPress={closeNoteModal}
                                disabled={noteSubmitting}
                                className="px-4 py-2 rounded-xl bg-gray-100"
                            >
                                <Text className="font-kumbh text-gray-700">
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveNote}
                                disabled={noteSubmitting}
                                className="px-4 py-2 rounded-xl bg-[#4C5FAB]"
                            >
                                {noteSubmitting ? (
                                    <View className="flex-row items-center">
                                        <ActivityIndicator color="#fff" />
                                        <Text className="text-white font-kumbh ml-2">
                                            Saving…
                                        </Text>
                                    </View>
                                ) : (
                                    <Text className="text-white font-kumbhBold">
                                        Save note
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            <ConfirmModal
                visible={Boolean(linkToDelete)}
                title="Delete link"
                message="This will remove the saved link permanently."
                onCancel={() => setLinkToDelete(null)}
                onConfirm={handleDeleteLink}
            />

            <ConfirmModal
                visible={Boolean(noteToDelete)}
                title="Delete note"
                message="Notes cannot be restored once deleted."
                onCancel={() => setNoteToDelete(null)}
                onConfirm={handleDeleteNote}
            />

            <ConfirmModal
                visible={Boolean(resourceToDelete)}
                title="Delete resource"
                message="This will remove the resource from this project permanently."
                onCancel={() => {
                    if (resourceDeleting) return;
                    setResourceToDelete(null);
                }}
                onConfirm={handleDeleteResource}
            />

            <Modal
                visible={Boolean(previewNote)}
                animationType="slide"
                onRequestClose={() => setPreviewNote(null)}
            >
                <View
                    className="flex-1 bg-white"
                    style={{
                        paddingTop: Platform.OS === "ios" ? insets.top : 0,
                    }}
                >
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
                        <Text className="font-kumbhBold text-base text-gray-900">
                            Note
                        </Text>
                        <Pressable
                            onPress={() => setPreviewNote(null)}
                            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                            accessibilityLabel="Close note preview"
                        >
                            <X size={18} color="#111827" />
                        </Pressable>
                    </View>
                    <ScrollView
                        className="px-4"
                        contentContainerStyle={{ paddingBottom: 32 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text className="font-kumbhBold text-2xl text-gray-900 mt-4">
                            {previewNote?.title || "Untitled"}
                        </Text>
                        <Text className="text-base text-gray-700 mt-4 leading-6">
                            {previewNote?.description ||
                                "No description added."}
                        </Text>
                    </ScrollView>
                </View>
            </Modal>

            <Modal
                visible={Boolean(previewMedia)}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewMedia(null)}
            >
                <GestureHandlerRootView className="flex-1">
                    <View className="flex-1 bg-black/90">
                        <View
                            className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4"
                            style={{
                                paddingTop:
                                    Platform.OS === "ios" ? insets.top + 8 : 16,
                            }}
                        >
                            <Text className="text-white font-kumbhBold text-base">
                                {previewMedia?.name || "Preview"}
                            </Text>
                            <Pressable
                                onPress={() => setPreviewMedia(null)}
                                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                                accessibilityLabel="Close preview"
                            >
                                <X size={18} color="#ffffff" />
                            </Pressable>
                        </View>

                        <View className="flex-1 items-center justify-center px-4">
                            {previewMedia?.type === "image" ? (
                                <ZoomableImage uri={previewMedia.uri} />
                            ) : previewMedia?.type === "video" ? (
                                <VideoPreview uri={previewMedia.uri} />
                            ) : previewMedia?.type === "audio" ? (
                                <AudioPreview uri={previewMedia.uri} />
                            ) : null}
                        </View>
                    </View>
                </GestureHandlerRootView>
            </Modal>

            {activeTab === "resources" && actionFor ? (
                <View className="absolute inset-0 bg-black/30">
                    <View className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl p-4">
                        <Text className="font-kumbhBold text-base mb-2">
                            Resource options
                        </Text>
                        <Pressable
                            onPress={() => {
                                setActionFor(null);
                                InteractionManager.runAfterInteractions(() => {
                                    previewResource(actionFor);
                                });
                            }}
                            className="py-3"
                        >
                            <Text className="font-kumbh">Preview</Text>
                        </Pressable>
                        <Pressable
                            onPress={async () => {
                                await downloadResource(actionFor);
                                setActionFor(null);
                            }}
                            className="py-3"
                        >
                            <Text className="font-kumbh">Download</Text>
                        </Pressable>
                        <Pressable
                            onPress={async () => {
                                await copyLink(actionFor);
                                setActionFor(null);
                            }}
                            className="py-3"
                        >
                            <Text className="font-kumbh">Copy link</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                if (!actionFor._id) {
                                    showError(
                                        "This resource cannot be deleted.",
                                    );
                                    setActionFor(null);
                                    return;
                                }
                                setResourceToDelete(actionFor);
                                setActionFor(null);
                            }}
                            className="py-3"
                        >
                            <Text className="font-kumbh text-red-600">
                                Delete resource
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setActionFor(null)}
                            className="py-3"
                        >
                            <Text className="text-gray-500 font-kumbh">
                                Cancel
                            </Text>
                        </Pressable>
                    </View>
                </View>
            ) : null}

            {uploading && (
                <View
                    pointerEvents="none"
                    className="absolute left-0 right-0 bottom-[90px] items-center"
                >
                    <View className="bg-gray-900 px-4 py-2.5 rounded-xl flex-row items-center">
                        <ActivityIndicator color="#fff" />
                        <Text className="text-white ml-2 font-kumbh">
                            Uploading… {uploadProgress}%
                        </Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

function ZoomableImage({ uri }: { uri: string }) {
    const baseScale = useRef(new Animated.Value(1)).current;
    const lastScaleRef = useRef(1);
    const doubleTapRef = useRef(null);

    return (
        <TapGestureHandler
            ref={doubleTapRef}
            numberOfTaps={2}
            onHandlerStateChange={(e) => {
                if (e.nativeEvent.state === GestureState.ACTIVE) {
                    const next = lastScaleRef.current > 1 ? 1 : 2;
                    lastScaleRef.current = next;
                    baseScale.setValue(next);
                }
            }}
        >
            <Animated.View style={{ transform: [{ scale: baseScale }] }}>
                <Image
                    source={{ uri }}
                    style={{ width: 320, height: 320, borderRadius: 12 }}
                    resizeMode="contain"
                />
            </Animated.View>
        </TapGestureHandler>
    );
}

function AudioPreview({ uri }: { uri: string }) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [barWidth, setBarWidth] = useState(0);

    useEffect(() => {
        let cancelled = false;
        let localSound: Audio.Sound | null = null;

        const load = async () => {
            try {
                const { sound: s } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: false },
                );
                if (cancelled) {
                    await s.unloadAsync();
                    return;
                }
                localSound = s;
                setSound(s);
                s.setOnPlaybackStatusUpdate((status) => {
                    if (!status.isLoaded) return;
                    setIsPlaying(status.isPlaying);
                    setPosition(status.positionMillis ?? 0);
                    setDuration(status.durationMillis ?? 0);
                });
            } catch {
                // ignore
            }
        };

        load();

        return () => {
            cancelled = true;
            if (localSound) {
                localSound.unloadAsync();
            }
            setSound(null);
        };
    }, [uri]);

    const toggle = async () => {
        if (!sound) return;
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) return;
        if (status.isPlaying) {
            await sound.pauseAsync();
        } else {
            await sound.playAsync();
        }
    };

    const seekTo = async (ratio: number) => {
        if (!sound || !duration) return;
        const ms = Math.max(
            0,
            Math.min(duration, Math.floor(duration * ratio)),
        );
        await sound.setPositionAsync(ms);
    };

    return (
        <View className="w-full max-w-[340px] rounded-2xl bg-white/10 px-4 py-4">
            <Text className="text-white font-kumbhBold text-base mb-2">
                Audio
            </Text>
            <Pressable
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                onPress={(e) => {
                    if (!barWidth) return;
                    const x = e.nativeEvent.locationX;
                    seekTo(x / barWidth);
                }}
                className="h-2 rounded-full bg-white/20 overflow-hidden mb-3"
            >
                <View
                    className="h-2 bg-white/80"
                    style={{
                        width:
                            duration > 0 && barWidth > 0
                                ? (position / duration) * barWidth
                                : 0,
                    }}
                />
            </Pressable>
            <View className="flex-row items-center justify-between">
                <Pressable
                    onPress={toggle}
                    className="px-4 py-2 rounded-full bg-white"
                >
                    <Text className="font-kumbhBold text-gray-900">
                        {isPlaying ? "Pause" : "Play"}
                    </Text>
                </Pressable>
                <Text className="text-white font-kumbh">
                    {formatAudioTime(position)} / {formatAudioTime(duration)}
                </Text>
            </View>
        </View>
    );
}

function formatAudioTime(ms: number) {
    if (!ms || ms < 0) return "0:00";
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoPreview({ uri }: { uri: string }) {
    const ref = useRef<Video>(null);

    return (
        <View className="w-full">
            <Video
                ref={ref}
                source={{ uri }}
                style={{ width: "100%", height: 260, borderRadius: 12 }}
                useNativeControls
                resizeMode="contain"
                shouldPlay
            />
            <Pressable
                onPress={() => ref.current?.presentFullscreenPlayerAsync?.()}
                className="mt-3 self-center flex-row items-center gap-2 rounded-full bg-white px-4 py-2"
            >
                <Maximize2 size={16} color="#111827" />
                <Text className="font-kumbhBold text-gray-900">Fullscreen</Text>
            </Pressable>
        </View>
    );
}
