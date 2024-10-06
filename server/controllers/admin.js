import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { rm } from 'fs'
import fs from 'fs'
import { promisify } from "util";
import { User } from '../models/User.js'

export const createCourse = async (req,res)=>{
    try{
        const {title, description, category,createdBy, duration,price} = req.body;

        const image = req.file;

        await Courses.create({
            title,
            description, 
            category, 
            createdBy, 
            image: image?.path, 
            duration, 
            price,
        })

        res.status(201).json({
            message: "Course created successfully!"
    })

    }catch(err){
        res.status(500).send(err);
    }
}


export const addLecture = async (req,res)=>{
    try{
        const course = await Courses.findById(req.params.id);

        if (!course){
            return res.status(404).json({
                message: "No course with this id"
            })
        }

        const {title,description}= req.body;

        const file = req.file;
        const lecture = await Lecture.create({
            title,
            description,
            video: file?.path,
            course: course._id
        })

        res.status(201).json({
            message: "Lecture Added",
            lecture,
        })
    }catch(err){
        res.status(500).send(err);
    }
}

export const deleteLecture = async (req,res)=>{
    try{
        const lecture = await Lecture.findById(req.params.id);

        rm(lecture.video, ()=>{
            console.log("Video removed");
        })

        await lecture.deleteOne();

        res.json({ message: "lecture Deleted" });
    }catch(err){
        res.status(500).send(err);
    }
}

const unlinkAsync = promisify(fs.unlink);

export const deleteCourse = async (req,res)=>{
    try{
        const course = await Courses.findById(req.params.id);

        const lectures = await Lecture.find({ course: course._id})

        await Promise.all(
            lectures.map(async(lecture)=>{
                await unlinkAsync(lecture.video)
                console.log("video deleted");
            })
        )

        rm(course.image, ()=>{
            console.log("Image removed");
        })

        await Lecture.find({course: req.params.id}).deleteMany();

        await course.deleteOne();

        await User.updateMany({}, {$pull: { subscription: req.params.id}} )

        res.json({ message: "Course Deleted" });
    }catch(err){
        res.status(500).send(err);
    }
}


export const getAllStats = async (req,res)=>{
    try{
        const totalCourses = (await Courses.find()).length;
        const totalLectures = (await Lecture.find()).length;
        const totalUser = (await User.find()).length;

        const stats = {
            totalCourses,
            totalLectures,
            totalUser,
        }

        res.json({stats});
    }catch(err){
        res.status(500).send(err);
    }
}
