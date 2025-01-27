import React from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import Icons from "../../lib/remixicon-react";
import { shareNote } from "../../utils/share";
import { Note } from "../../store/types";

type SDialogProps = {
  isOpen: boolean;
  closeDialog: () => void;
  note: Note;
  notesState: any;
  translations: any;
  handlePrint: (filename: string) => void;
};

const SDialog: React.FC<SDialogProps> = ({
  isOpen,
  closeDialog,
  note,
  notesState,
  handlePrint,
  translations,
}) => {
  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-[1000] flex justify-center items-center print:hidden"
        onClose={closeDialog}
      >
        <DialogBackdrop className="fixed inset-0 bg-neutral-300 dark:bg-neutral-800 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />
        <div className="fixed inset-0 flex items-center justify-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="bg-white dark:bg-[#2D2C2C] p-6 rounded-2xl w-full max-w-lg mx-4">
              <div className="flex justify-between items-center">
                <DialogTitle as="h2" className="text-xl font-semibold">
                  {translations.editor.exportas || "-"}
                </DialogTitle>
                <button
                  onClick={closeDialog}
                  className="text-white dark:text-[color:var(--selected-dark-text)] bg-neutral-300 dark:bg-neutral-700 rounded-full hover:text-neutral-100 focus:outline-none p-2"
                >
                  <Icons.CloseLineIcon />
                </button>
              </div>
              <div className="my-2 border-b dark:border-neutral-500"></div>
              <div className="mt-4 space-y-4 p-2 bg-[#F8F8F7] dark:bg-neutral-800 rounded-xl">
                {/* Button for File Text */}
                <div className="flex items-center w-full">
                  <button
                    className="w-full bg-[#F8F8F7] dark:bg-neutral-800 p-4 text-lg rounded-xl inline-flex justify-between items-center"
                    aria-label="BEA"
                    onClick={() => shareNote(note.id, notesState)}
                  >
                    <p className="text-base pl-2 font-bold">BEA</p>
                    <Icons.FileTextLineIcon
                      className="w-6 h-6"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                {/* Button for File PDF */}
                <div className="flex items-center w-full">
                  <button
                    className="w-full bg-[#F8F8F7] dark:bg-neutral-800 p-4 text-lg rounded-xl inline-flex justify-between items-center"
                    onClick={() => handlePrint(`${note.title}.pdf`)}
                    aria-label="PDF"
                  >
                    <p className="text-base pl-2 font-bold">PDF</p>
                    <Icons.FileArticleLine
                      className="w-6 h-6"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </DialogPanel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SDialog;
