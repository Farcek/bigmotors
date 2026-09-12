import { Input } from "@mantine/core";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

export function VehicleContentEditor({ value, onChange, disabled, error }: { value: string; onChange: (html: string) => void; disabled: boolean; error?: React.ReactNode }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })],
    content: value, immediatelyRender: false, shouldRerenderOnTransaction: true,
    editorProps: { attributes: { "aria-label": "Дэлгэрэнгүй агуулга" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  return <Input.Wrapper label="Дэлгэрэнгүй агуулга" error={error}>
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar>
        <RichTextEditor.ControlsGroup><RichTextEditor.Bold /><RichTextEditor.Italic /><RichTextEditor.Underline /><RichTextEditor.ClearFormatting /></RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup><RichTextEditor.H2 /><RichTextEditor.H3 /><RichTextEditor.BulletList /><RichTextEditor.OrderedList /></RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup><RichTextEditor.Link /><RichTextEditor.Unlink /></RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup><RichTextEditor.Undo /><RichTextEditor.Redo /></RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={240} />
    </RichTextEditor>
  </Input.Wrapper>;
}
