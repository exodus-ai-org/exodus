export const exampleCode = `
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    Brush,
    Menu,
    X,
    Facebook,
    Twitter,
    Instagram,
    ChevronRight
} from 'lucide-react';

// 假设的图片 URL，你需要替换为实际的图片 URL
const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/EEE/31343C';
const PLACEHOLDER_SMALL_IMAGE = 'https://placehold.co/400x300/EEE/31343C';
const PLACEHOLDER_NEWS_IMAGE = 'https://placehold.co/400x200/EEE/31343C';

// 字体
const serifFont = 'font-serif';

// 导航数据
const navLinks = [
    { id: 'home', label: '首页', href: '#home' },
    { id: 'about', label: '关于我们', href: '#about' },
    { id: 'gallery', label: '作品展示', href: '#gallery' },
    { id: 'courses', label: '课程', href: '#courses' },
    { id: 'news', label: '新闻', href: '#news' },
    { id: 'contact', label: '联系我们', href: '#contact' },
];

// 社交媒体链接
const socialLinks = [
    { icon: <Facebook className="h-5 w-5" />, href: '#' },
    { icon: <Twitter className="h-5 w-5" />, href: '#' },
    { icon: <Instagram className="h-5 w-5" />, href: '#' },
];

// 友情链接
const friendLinks = [
    { label: '链接1', href: '#' },
    { label: '链接2', href: '#' },
];

/**
 * 首页横幅组件
 */
const HomeBanner = () => (
    <section id="home" className="bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800 py-20">
        <div className="container mx-auto px-4 text-center">
            <h2 className={cn("text-4xl font-bold mb-4", serifFont)}>传承书法艺术，弘扬文化精髓</h2>
            <p className="text-lg mb-8">
                我们致力于书法和绘画的教学、创作和交流，培养艺术人才，推动文化发展。
            </p>
            <Button
                variant="default"
                size="lg"
                className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition duration-300"
                onClick={() => {
                    const aboutSection = document.getElementById('about');
                    if (aboutSection) {
                        aboutSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }}
            >
                了解更多
            </Button>
        </div>
    </section>
);

/**
 * 关于我们组件
 */
const AboutUs = () => (
    <section id="about" className="bg-white py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
            <div>
                <h2 className={cn("text-3xl font-semibold mb-4 text-gray-800", serifFont)}>关于我们</h2>
                <p className="text-lg text-gray-700 mb-6">
                    书法书画院成立于[年份]，是一所致力于传承和弘扬中华优秀传统文化的艺术机构。
                    我们拥有一支由知名书法家和画家组成的师资团队，提供专业的书法、绘画培训课程，并定期举办展览和交流活动。
                </p>
                <p className="text-lg text-gray-700">
                    我们的使命是：[使命]。我们的愿景是：[愿景]。
                </p>
            </div>
            <div>
                <img src={PLACEHOLDER_IMAGE} alt="About Us" className="rounded-lg shadow-lg" />
            </div>
        </div>
    </section>
);

/**
 * 作品展示组件
 */
const Gallery = () => (
    <section id="gallery" className="bg-gray-100 py-20">
        <div className="container mx-auto px-4">
            <h2 className={cn("text-3xl font-semibold mb-8 text-center text-gray-800", serifFont)}>作品展示</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* 作品 1 */}
                <Card className="overflow-hidden">
                    <img src={PLACEHOLDER_SMALL_IMAGE} alt="作品 1" className="w-full h-auto" />
                    <CardContent className="p-4">
                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">作品名称 1</CardTitle>
                        <CardDescription className="text-gray-600">作者：XXX</CardDescription>
                    </CardContent>
                </Card>

                {/* 作品 2 */}
                <Card className="overflow-hidden">
                    <img src={PLACEHOLDER_SMALL_IMAGE} alt="作品 2" className="w-full h-auto" />
                    <CardContent className="p-4">
                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">作品名称 2</CardTitle>
                        <CardDescription className="text-gray-600">作者：XXX</CardDescription>
                    </CardContent>
                </Card>

                {/* 作品 3 */}
                <Card className="overflow-hidden">
                    <img src={PLACEHOLDER_SMALL_IMAGE} alt="作品 3" className="w-full h-auto" />
                    <CardContent className="p-4">
                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">作品名称 3</CardTitle>
                        <CardDescription className="text-gray-600">作者：XXX</CardDescription>
                    </CardContent>
                </Card>
            </div>
            <div className="text-center mt-10">
                <Button
                    variant="default"
                    size="lg"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition duration-300"
                >
                    查看更多作品
                </Button>
            </div>
        </div>
    </section>
);

/**
 * 课程介绍组件
 */
const Courses = () => (
    <section id="courses" className="bg-white py-20">
        <div className="container mx-auto px-4">
            <h2 className={cn("text-3xl font-semibold mb-8 text-center text-gray-800", serifFont)}>课程介绍</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* 课程 1 */}
                <Card className="bg-gray-100">
                    <CardHeader>
                        <CardTitle className="text-2xl font-semibold text-gray-800">书法基础班</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700 mb-4">
                            适合零基础学员，学习基本笔画、结构和书写技巧。
                        </p>
                        <ul className="list-disc list-inside text-gray-600">
                            <li>课程内容 1</li>
                            <li>课程内容 2</li>
                            <li>课程内容 3</li>
                        </ul>
                    </CardContent>
                </Card>

                {/* 课程 2 */}
                <Card className="bg-gray-100">
                    <CardHeader>
                        <CardTitle className="text-2xl font-semibold text-gray-800">绘画进阶班</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700 mb-4">
                            适合有一定基础的学员，学习更高级的绘画技巧和创作方法。
                        </p>
                        <ul className="list-disc list-inside text-gray-600">
                            <li>课程内容 1</li>
                            <li>课程内容 2</li>
                            <li>课程内容 3</li>
                        </ul>
                    </CardContent>
                </Card>

                {/* 课程 3 */}
                <Card className="bg-gray-100">
                    <CardHeader>
                        <CardTitle className="text-2xl font-semibold text-gray-800">书法创作班</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700 mb-4">
                            适合有较好书法基础的学员，指导学员进行书法创作。
                        </p>
                        <ul className="list-disc list-inside text-gray-600">
                            <li>课程内容 1</li>
                            <li>课程内容 2</li>
                            <li>课程内容 3</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
            <div className="text-center mt-10">
                <Button
                    variant="default"
                    size="lg"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition duration-300"
                >
                    查看更多课程
                </Button>
            </div>
        </div>
    </section>
);

/**
 * 新闻动态组件
 */
const News = () => (
    <section id="news" className="bg-gray-100 py-20">
        <div className="container mx-auto px-4">
            <h2 className={cn("text-3xl font-semibold mb-8 text-center text-gray-800", serifFont)}>新闻动态</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* 新闻 1 */}
                <Card className="overflow-hidden">
                    <img src={PLACEHOLDER_NEWS_IMAGE} alt="新闻 1" className="w-full h-auto" />
                    <CardContent className="p-4">
                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">新闻标题 1</CardTitle>
                        <CardDescription className="text-gray-600 mb-2">发布日期：2024-07-28</CardDescription>
                        <p className="text-gray-700">新闻摘要...</p>
                    </CardContent>
                </Card>

                {/* 新闻 2 */}
                <Card className="overflow-hidden">
                    <img src={PLACEHOLDER_NEWS_IMAGE} alt="新闻 2" className="w-full h-auto" />
                    <CardContent className="p-4">
                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">新闻标题 2</CardTitle>
                        <CardDescription className="text-gray-600 mb-2">发布日期：2024-07-27</CardDescription>
                        <p className="text-gray-700">新闻摘要...</p>
                    </CardContent>
                </Card>

                {/* 新闻 3 */}
                <Card className="overflow-hidden">
                    <img src={PLACEHOLDER_NEWS_IMAGE} alt="新闻 3" className="w-full h-auto" />
                    <CardContent className="p-4">
                        <CardTitle className="text-xl font-semibold text-gray-800 mb-2">新闻标题 3</CardTitle>
                        <CardDescription className="text-gray-600 mb-2">发布日期：2024-07-26</CardDescription>
                        <p className="text-gray-700">新闻摘要...</p>
                    </CardContent>
                </Card>
            </div>
            <div className="text-center mt-10">
                <Button
                    variant="default"
                    size="lg"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition duration-300"
                >
                    查看更多新闻
                </Button>
            </div>
        </div>
    </section>
);

/**
 * 联系我们组件
 */
const Contact = () => (
    <section id="contact" className="bg-white py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10">
            <div>
                <h2 className={cn("text-3xl font-semibold mb-4 text-gray-800", serifFont)}>联系我们</h2>
                <p className="text-lg text-gray-700 mb-4">
                    地址：[地址]
                </p>
                <p className="text-lg text-gray-700 mb-4">
                    电话：[电话]
                </p>
                <p className="text-lg text-gray-700">
                    邮箱：[邮箱]
                </p>
            </div>
            <div>
                <Card className="bg-gray-100 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-2xl font-semibold text-gray-800">留言</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">姓名</label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="请输入您的姓名"
                                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">邮箱</label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="请输入您的邮箱"
                                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-gray-700 text-sm font-bold mb-2">留言内容</label>
                            <Textarea
                                id="message"
                                name="message"
                                placeholder="请输入您的留言"
                                className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="default"
                            size="lg"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition duration-300 focus:outline-none focus:shadow-outline"
                        >
                            发送留言
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    </section>
);

/**
 * 底部组件
 */
const Footer = () => (
    <footer className="bg-gray-200 py-6">
        <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
                <p className="text-gray-600 text-sm">
                    © 2024 书法书画院. All rights reserved.
                </p>
                <div className="flex space-x-4">
                    {socialLinks.map((link, index) => (
                        <a
                            key={index}
                            href={link.href}
                            className="text-gray-700 hover:text-blue-500 transition duration-300"
                            aria-label={\`Visit us on \${link.href.includes('facebook') ? 'Facebook' : link.href.includes('twitter') ? 'Twitter' : 'Instagram'}\`}
                        >
                            {link.icon}
                        </a>
                    ))}
                </div>
                <div>
                    <p className="text-gray-600 text-sm">
                        友情链接：
                        {friendLinks.map((link, index) => (
                            <React.Fragment key={index}>
                                <a href={link.href} className="text-blue-500 hover:underline">
                                    {link.label}
                                </a>
                                {index < friendLinks.length - 1 && ' '}
                            </React.Fragment>
                        ))}
                    </p>
                </div>
            </div>
        </div>
    </footer>
);

/**
 * 主应用组件
 */
const App = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('home');

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const handleNavLinkClick = (sectionId: string) => {
        setActiveSection(sectionId);
        closeMobileMenu(); // Close menu after clicking a link
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            let currentSectionId = '';
            document.querySelectorAll('section').forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (window.scrollY >= sectionTop - 100 && window.scrollY < sectionTop + sectionHeight - 100) {
                    currentSectionId = section.getAttribute('id') || '';
                }
            });

             setActiveSection(currentSectionId);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-gray-100">
            {/* 头部区域 */}
            <header className="bg-white shadow-md py-4">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <h1 className={cn("text-2xl font-semibold text-gray-800", serifFont)}>
                        <Brush className="inline-block text-blue-500 mr-2 h-6 w-6" />
                        书法书画院
                    </h1>
                    <nav className="hidden md:block">
                        <ul className="flex space-x-6">
                            {navLinks.map(link => (
                                <li key={link.id}>
                                    <a
                                        href={link.href}
                                        className={cn(
                                            "text-gray-700 hover:text-blue-500 transition duration-300",
                                            activeSection === link.id && 'active' // Apply active class
                                        )}
                                        onClick={() => handleNavLinkClick(link.id)}

                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <Button
                        variant="ghost"
                        size="icon"
                        id="hamburger-btn"
                        className="md:hidden text-gray-700 focus:outline-none"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle Navigation"
                    >
                        <Menu className="h-6 w-6" />
                    </Button>
                </div>
            </header>

            {/* 移动端导航菜单 */}
            <div
                id="mobile-menu"
                className={cn(
                    "fixed top-0 left-0 w-full h-full bg-gray-900 bg-opacity-90 z-50 transition-all duration-300",
                    isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full hidden'
                )}
                style={{
                    transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
                    display: isMobileMenuOpen ? 'block' : 'none'
                }}
            >
                <div className="bg-white w-80 h-full absolute right-0 p-6">
                    <div className="flex justify-end mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            id="close-menu-btn"
                            className="text-gray-700 focus:outline-none"
                            onClick={closeMobileMenu}
                            aria-label="Close Menu"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    <nav className="block">
                        <ul className="space-y-4">
                            {navLinks.map(link => (
                                <li key={link.id}>
                                    <a
                                        href={link.href}
                                         className={cn(
                                            "block text-lg text-gray-700 hover:text-blue-500 transition duration-300",
                                             activeSection === link.id && 'active'
                                        )}
                                        onClick={() => handleNavLinkClick(link.id)}
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </div>

            {/* 页面内容 */}
            <HomeBanner />
            <AboutUs />
            <Gallery />
            <Courses />
            <News />
            <Contact />
            <Footer />
        </div>
    );
};

export default App;
`
