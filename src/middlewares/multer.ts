import multer from "multer";

const multerUpload = multer({
    limits : {
        fileSize : 1024 * 1024 * 10
    }
});

export const singleUpload = multerUpload.single("avatar");

export const multipleUpload = multerUpload.array("files",10);
