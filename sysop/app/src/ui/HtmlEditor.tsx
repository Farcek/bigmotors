import { Input } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId, type ReactNode } from "react";

export function HtmlEditor({ label, value, onChange, disabled = false, error }: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  error?: ReactNode;
}) {
  const id = useId();
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })],
    content: value,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
    editor?.setOptions({ editorProps: { attributes: {
      id, role: "textbox", "aria-label": label, "aria-multiline": "true",
      "aria-invalid": String(Boolean(error)), "aria-disabled": String(disabled),
      "aria-describedby": error ? `${id}-error` : "",
    } } });
  }, [editor, disabled, error, id, label]);

  return <Input.Wrapper id={id} label={label} error={error}>
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold disabled={disabled} />
          <RichTextEditor.Italic disabled={disabled} />
          <RichTextEditor.Underline disabled={disabled} />
          <RichTextEditor.ClearFormatting disabled={disabled} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.BulletList disabled={disabled} />
          <RichTextEditor.OrderedList disabled={disabled} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link disabled={disabled} />
          <RichTextEditor.Unlink disabled={disabled} />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo disabled={disabled} />
          <RichTextEditor.Redo disabled={disabled} />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={90} />
    </RichTextEditor>
  </Input.Wrapper>;
}
